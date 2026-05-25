const CanvasManager = {
    canvas: null,
    previewCanvas: null,
    previewCtx: null,
    ctx: null,
    gridCanvas: null,
    gridCtx: null,
    gridOverlay: null,
    gridOverlayCtx: null,
    showRuler: false,
    rulerTop: null,
    rulerLeft: null,
    rulerTopCtx: null,
    rulerLeftCtx: null,
    layers: [],
    activeLayerIndex: 0,
    width: 1920,
    height: 1080,
    defaultWidth: 1920,
    defaultHeight: 1080,
    pixelRatio: window.devicePixelRatio || 1,
    showGrid: true,
    compositeCanvas: null,
    compositeCtx: null,
    compositeDirty: true,
    _rafPending: false,
    backgroundColor: '#ffffff',
    gridType: 'none',

    scheduleRedraw() {
        if (this._rafPending) return;
        this._rafPending = true;
        requestAnimationFrame(() => {
            this._rafPending = false;
            this.redraw();
        });
    },
    
    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.setupHighResCanvas();

        this.addLayer("Фон");
        this.redraw();

        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
        
        this.previewCtx.globalCompositeOperation = 'source-over';
    },

    setBackgroundColor(color) {
        this.backgroundColor = color;
        this.scheduleRedraw();
        // Инвалидируем миниатюру фонового слоя
        if (this.layers.length > 0) {
            this.layers[0].needsThumbnailUpdate = true;
            LayersManager?.invalidateLayerThumbnail(0);
            LayersManager?.scheduleThumbnailUpdates();
        }
    },
    
    setGridType(type) {
        this.gridType = type;
        this.scheduleRedraw();
    },

    // Новый метод ТОЛЬКО для фонового узора (заменяет старый drawGrid)
    drawBackgroundPattern(ctx) {
        if (this.gridType === 'none') return;

        ctx.save();
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.4)';
        ctx.fillStyle = 'rgba(180, 180, 180, 0.6)';
        ctx.lineWidth = 1;
        
        const step = 20;

        if (this.gridType === 'grid') {
            ctx.beginPath();
            for (let x = 0; x <= this.width; x += step) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
            }
            for (let y = 0; y <= this.height; y += step) {
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
            }
            ctx.stroke();
        } else if (this.gridType === 'dots') {
            for (let x = step; x < this.width; x += step) {
                for (let y = step; y < this.height; y += step) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    },
       
    setupHighResCanvas() {
        const container = this.canvas.parentElement;
        const aspectRatio = this.defaultWidth / this.defaultHeight;
        const availableWidth = container ? Math.max(1, container.clientWidth * 0.95) : this.defaultWidth;
        const availableHeight = container ? Math.max(1, container.clientHeight * 0.95) : this.defaultHeight;

        let targetWidth = Math.min(this.defaultWidth, availableWidth);
        let targetHeight = Math.round(targetWidth / aspectRatio);

        if (targetHeight > availableHeight) {
            targetHeight = Math.min(this.defaultHeight, Math.round(availableHeight));
            targetWidth = Math.round(targetHeight * aspectRatio);
        }

        this.width = Math.max(1, targetWidth);
        this.height = Math.max(1, targetHeight);

        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        // Пересоздаем canvas сетки при изменении размера
        this.createGridCanvas();
        this.createCompositeCanvas();


        // Пересоздание слоёв
        this.layers.forEach(layer => {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = this.canvas.width;
            newCanvas.height = this.canvas.height;
            const newCtx = newCanvas.getContext('2d');
            newCtx.scale(this.pixelRatio, this.pixelRatio);
            newCtx.imageSmoothingEnabled = true;
            newCtx.imageSmoothingQuality = 'high';
            
            // Сохраняем текущую растровую информацию слоя (заливка, ластик, и т.п.)
            if (layer.canvas) {
                newCtx.drawImage(layer.canvas, 0, 0, this.width, this.height);
            }
            
            layer.canvas = newCanvas;
            layer.ctx = newCtx;
        });

        // Пересоздание preview
        const oldPreview = this.previewCanvas;
        this.createCompositeCanvas();
        this.compositeDirty = true;
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
        if (oldPreview) this.previewCtx.drawImage(oldPreview, 0, 0);

        if (this.showRuler) {
            this.removeRulerOverlay();
            this.createRulerOverlay();
        }
    },

    // Создание отдельного canvas для сетки
    createGridCanvas() {
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = this.canvas.width;
        this.gridCanvas.height = this.canvas.height;
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.gridCtx.scale(this.pixelRatio, this.pixelRatio);
        this.drawGridOnCanvas(this.gridCtx);
    },

    createCompositeCanvas() {
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = this.canvas.width;
        this.compositeCanvas.height = this.canvas.height;
        this.compositeCtx = this.compositeCanvas.getContext('2d');
        this.compositeCtx.scale(this.pixelRatio, this.pixelRatio);
        this.compositeDirty = true;
    },

    // Создание overlay canvas для сетки (не физический)
    createGridOverlay() {
        if (this.gridOverlay) {
            this.gridOverlay.remove(); // Удаляем старый, чтобы не накапливать
        }

        // Для абсолютного overlay нужен позиционированный контейнер
        const container = this.canvas.parentElement;
        if (container && window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        this.gridOverlay = document.createElement('canvas');
        this.gridOverlay.width = this.canvas.width;
        this.gridOverlay.height = this.canvas.height;
        this.gridOverlay.style.position = 'absolute';
        this.gridOverlay.style.top = '0';
        this.gridOverlay.style.left = '0';
        this.gridOverlay.style.pointerEvents = 'none'; // Не мешает событиям мыши
        this.gridOverlay.style.zIndex = '9999'; // Всегда поверх
        this.gridOverlay.style.transformOrigin = 'top left';
        this.gridOverlayCtx = this.gridOverlay.getContext('2d');
        this.gridOverlayCtx.scale(this.pixelRatio, this.pixelRatio);
        this.drawGridOnCanvas(this.gridOverlayCtx);

        // Добавляем overlay в контейнер canvas
        container.appendChild(this.gridOverlay);

        // Синхронизируем трансформацию с основным canvas
        this.syncGridOverlayTransform();
    },

    // Создать overlay линейки (верхнюю и левую)
    createRulerOverlay() {
        const container = this.canvas.parentElement;
        if (!container) return;

        // Удаляем существующие
        if (this.rulerTop) this.rulerTop.remove();
        if (this.rulerLeft) this.rulerLeft.remove();

        // Позиционируем контейнер относительно
        if (window.getComputedStyle(container).position === 'static') container.style.position = 'relative';

        const canvasLeft = this.canvas.offsetLeft;
        const canvasTop = this.canvas.offsetTop;
        const canvasCssWidth = this.canvas.clientWidth;
        const canvasCssHeight = this.canvas.clientHeight;

        // Верхняя линейка располагается непосредственно над холстом
        this.rulerTop = document.createElement('canvas');
        this.rulerTop.width = Math.round(this.width * this.pixelRatio);
        this.rulerTop.height = Math.round(24 * this.pixelRatio);
        this.rulerTop.style.position = 'absolute';
        this.rulerTop.style.top = `${canvasTop - 24}px`;
        this.rulerTop.style.left = `${canvasLeft}px`;
        this.rulerTop.style.width = `${canvasCssWidth}px`;
        this.rulerTop.style.height = `24px`;
        this.rulerTop.style.pointerEvents = 'none';
        this.rulerTop.style.zIndex = '1';
        this.rulerTop.style.transformOrigin = 'top left';
        this.rulerTopCtx = this.rulerTop.getContext('2d');
        this.rulerTopCtx.scale(this.pixelRatio, this.pixelRatio);

        // Левая линейка располагается непосредственно слева от холста
        this.rulerLeft = document.createElement('canvas');
        this.rulerLeft.width = Math.round(24 * this.pixelRatio);
        this.rulerLeft.height = Math.round(this.height * this.pixelRatio);
        this.rulerLeft.style.position = 'absolute';
        this.rulerLeft.style.top = `${canvasTop}px`;
        this.rulerLeft.style.left = `${canvasLeft - 24}px`;
        this.rulerLeft.style.width = `24px`;
        this.rulerLeft.style.height = `${canvasCssHeight}px`;
        this.rulerLeft.style.pointerEvents = 'none';
        this.rulerLeft.style.zIndex = '1';
        this.rulerLeft.style.transformOrigin = 'top left';
        this.rulerLeftCtx = this.rulerLeft.getContext('2d');
        this.rulerLeftCtx.scale(this.pixelRatio, this.pixelRatio);

        container.appendChild(this.rulerTop);
        container.appendChild(this.rulerLeft);

        this.drawRulers();
        this.syncGridOverlayTransform();
    },

    // Удалить линейку overlay
    removeRulerOverlay() {
        if (this.rulerTop) { this.rulerTop.remove(); this.rulerTop = null; this.rulerTopCtx = null; }
        if (this.rulerLeft) { this.rulerLeft.remove(); this.rulerLeft = null; this.rulerLeftCtx = null; }
    },

    // Рисуем деления линейки
    drawRulers() {
        if (!this.rulerTopCtx || !this.rulerLeftCtx) return;

        const topCtx = this.rulerTopCtx;
        const leftCtx = this.rulerLeftCtx;

        const width = this.width;
        const height = this.height;

        // Очистка
        topCtx.clearRect(0, 0, width, 40);
        leftCtx.clearRect(0, 0, 40, height);

        topCtx.fillStyle = '#2d2d2d';
        topCtx.fillRect(0, 0, width, 24);
        leftCtx.fillStyle = '#2d2d2d';
        leftCtx.fillRect(0, 0, 24, height);

        topCtx.strokeStyle = '#999';
        topCtx.fillStyle = '#ddd';
        topCtx.font = '10px Arial';
        topCtx.textBaseline = 'top';

        // Основные и промежуточные деления каждые 50px и 10px
        for (let x = 0; x <= width; x += 10) {
            const isMajor = x % 50 === 0;
            const y1 = isMajor ? 0 : 8;
            topCtx.beginPath();
            topCtx.moveTo(x + 0.5, 24);
            topCtx.lineTo(x + 0.5, 24 - y1);
            topCtx.strokeStyle = isMajor ? '#666' : '#444';
            topCtx.lineWidth = isMajor ? 1 : 0.7;
            topCtx.stroke();
            if (isMajor) {
                topCtx.fillText(String(x), x + 2, 2);
            }
        }

        leftCtx.strokeStyle = '#999';
        leftCtx.fillStyle = '#ddd';
        leftCtx.font = '10px Arial';
        leftCtx.textBaseline = 'top';

        for (let y = 0; y <= height; y += 10) {
            const isMajor = y % 50 === 0;
            const x1 = isMajor ? 0 : 8;
            leftCtx.beginPath();
            leftCtx.moveTo(24, y + 0.5);
            leftCtx.lineTo(24 - x1, y + 0.5);
            leftCtx.strokeStyle = isMajor ? '#666' : '#444';
            leftCtx.lineWidth = isMajor ? 1 : 0.7;
            leftCtx.stroke();
            if (isMajor) {
                leftCtx.save();
                leftCtx.translate(2, y + 2);
                leftCtx.rotate(-Math.PI/2);
                leftCtx.fillText(String(y), 0, 0);
                leftCtx.restore();
            }
        }
    },

    // Синхронизировать трансформацию overlay'ей с основным canvas
    syncGridOverlayTransform() {
        const offsetX = (NavigationManager && NavigationManager.offsetX) ? NavigationManager.offsetX : 0;
        const offsetY = (NavigationManager && NavigationManager.offsetY) ? NavigationManager.offsetY : 0;
        const scale = (NavigationManager && NavigationManager.scale) ? NavigationManager.scale : 1;
        const transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;

        const canvasLeft = this.canvas.offsetLeft;
        const canvasTop = this.canvas.offsetTop;
        const canvasCssWidth = this.canvas.clientWidth;
        const canvasCssHeight = this.canvas.clientHeight;

        if (this.gridOverlay) {
            this.gridOverlay.style.transform = transform;
            this.gridOverlay.style.transformOrigin = 'top left';
        }
        if (this.rulerTop) {
            this.rulerTop.style.left = `${canvasLeft}px`;
            this.rulerTop.style.top = `${canvasTop - 24}px`;
            this.rulerTop.style.width = `${canvasCssWidth}px`;
            this.rulerTop.style.transform = transform;
            this.rulerTop.style.transformOrigin = 'top left';
        }
        if (this.rulerLeft) {
            this.rulerLeft.style.left = `${canvasLeft - 24}px`;
            this.rulerLeft.style.top = `${canvasTop}px`;
            this.rulerLeft.style.height = `${canvasCssHeight}px`;
            this.rulerLeft.style.transform = transform;
            this.rulerLeft.style.transformOrigin = 'top left';
        }
    },

    // Переключатель линейки
    toggleRuler() {
        this.showRuler = !this.showRuler;
        if (this.showRuler) {
            this.createRulerOverlay();
        } else {
            this.removeRulerOverlay();
        }
        return this.showRuler;
    },

// Рисование сетки на отдельном canvas
    drawGridOnCanvas(ctx) {
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5 / this.pixelRatio;
        
        for (let i = 0; i <= this.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.height);
            ctx.strokeStyle = i % 100 === 0 ? '#d0d0d0' : '#e8e8e8';
            ctx.stroke();
        }
        
        for (let i = 0; i <= this.height; i += 20) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(this.width, i);
            ctx.strokeStyle = i % 100 === 0 ? '#d0d0d0' : '#e8e8e8';
            ctx.stroke();
        }
        ctx.restore();
    },

    // Переключение видимости сетки
    toggleGrid() {
        this.showGrid = !this.showGrid;
        const container = this.canvas?.parentElement;
        if (container) {
            container.classList.toggle('no-grid', !this.showGrid);
        }
        if (!this.showGrid && this.gridOverlay) {
            this.gridOverlay.remove();
            this.gridOverlay = null;
            this.gridOverlayCtx = null;
        }
        this.redraw();
        return this.showGrid;
    },

    addLayer(name = null, shouldRedraw = true) {
        const offscreen = document.createElement('canvas');
        offscreen.width = this.canvas.width;
        offscreen.height = this.canvas.height;

        const layer = {
            id: `layer-${Date.now()}`,
            name: name || `Слой ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            canvas: offscreen,
            ctx: offscreen.getContext('2d'),
            objects: []
        };

        layer.ctx.scale(this.pixelRatio, this.pixelRatio);
        layer.ctx.imageSmoothingEnabled = true;
        layer.ctx.imageSmoothingQuality = 'high';

        this.layers.push(layer);
        this.activeLayerIndex = this.layers.length - 1;
        this.compositeDirty = true;

        LayersManager?.updateLayersList();
        if (shouldRedraw) {
            this.redraw();
        }

        LayersManager?.updateCollapsedLayerPreview();

        return layer;
    },

    get activeLayer() {
        return this.layers[this.activeLayerIndex] || null;
    },

    newProject(width, height) {
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));

        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        // Пересоздаем canvas сетки
        this.createGridCanvas();
        this.createCompositeCanvas();

        // сброс preview
        if (this.previewCanvas) {
            this.previewCanvas.width = this.canvas.width;
            this.previewCanvas.height = this.canvas.height;
            this.previewCtx = this.previewCanvas.getContext('2d');
            this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
        }

        if (this.showRuler) {
            this.removeRulerOverlay();
            this.createRulerOverlay();
        }

        // очистка слоёв и создание фонового
        this.layers = [];
        this.addLayer('Фон');
        this.redraw();
        
        // сбрасываем навигацию и историю
        if (NavigationManager) {
            NavigationManager.scale = 1;
            NavigationManager.offsetX = 0;
            NavigationManager.offsetY = 0;
            NavigationManager.updateZoom();
        }
        if (HistoryManager && HistoryManager.reset) {
            HistoryManager.reset();
        } else {
            HistoryManager?.saveState();
        }
        LayersManager?.updateLayersList();
    },

        addObject(obj) {
        if (!obj) {
            console.warn('Пустой объект');
            return;
        }
        
        // Защита от дублирования - проверяем, не добавлен ли уже этот объект
        // Проверяем все слои на наличие такого же объекта (по ссылке)
        let alreadyExists = false;
        for (let layer of this.layers) {
            if (layer.objects.includes(obj)) {
                alreadyExists = true;
                console.log('Объект уже существует в слое, пропускаем добавление');
                break;
            }
        }
        
        if (alreadyExists) {
            return;
        }

        // Для ластика операция должна происходить на активном слое,
        // иначе destination-out будет стирать только прозрачный новый слой
        if (obj.tool === 'eraser') {
            const currentLayer = this.activeLayer || this.addLayer('Фон');
            currentLayer.objects.push(obj);
            this.drawSingleObject(currentLayer.ctx, obj);
            this.compositeDirty = true;
            this.redraw();
            LayersManager?.updateLayersList();
            HistoryManager?.saveState();
            console.log(`Объект ${obj.type} добавлен в активный слой "${currentLayer.name}"`);
            return;
        }

        // Получаем название объекта
        const typeName = LayersManager.getLayerTypeName(obj.type);
        const layerName = obj.type === 'text'
            ? (obj.text ? obj.text.slice(0, 30) : 'Текст')
            : typeName;
        
        // Создаём новый слой для этого объекта
        const newLayer = this.addLayer(layerName, false);
        
        // Добавляем объект в новый слой
        newLayer.objects.push(obj);
        
        // Сохраняем информацию об объекте для превью
        newLayer.objectType = obj.type;
        newLayer.needsThumbnailUpdate = true;
        
        // Рисуем объект на слое
        this.drawSingleObject(newLayer.ctx, obj);
        
        // Отметить, что композит надо пересобрать
        this.compositeDirty = true;
        
        // Обновляем основной холст
        this.redraw();
        
        // Обновляем список слоев
        LayersManager?.updateLayersList();
        HistoryManager?.saveState();

        console.log(`Объект ${obj.type} добавлен в новый слой "${newLayer.name}"`);
    },

    redraw() {
        if (!this.ctx) return;

        // 1. Очищаем холст
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 2. Заливаем холст актуальным цветом фона
        this.ctx.fillStyle = this.backgroundColor || '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 3. Добавляем узор фона (если он выбран в пресетах)
        this.drawBackgroundPattern(this.ctx);

        // Пересобираем композит, если слои изменились
        if (this.compositeDirty) {
            if (this.compositeCtx) {
                this.compositeCtx.clearRect(0, 0, this.width, this.height);
                this.layers.forEach((layer) => {
                    if (layer.visible) {
                        this.compositeCtx.globalAlpha = layer.opacity;
                        this.compositeCtx.drawImage(layer.canvas, 0, 0, this.width, this.height);
                    }
                });
                this.compositeCtx.globalAlpha = 1;
            }
            this.compositeDirty = false;
        }

        if (this.compositeCanvas) {
            this.ctx.drawImage(this.compositeCanvas, 0, 0, this.width, this.height);
        }

        this.ctx.globalAlpha = 1;

        // Рисуем сетку поверх слоёв (не влияет на данные слоёв)
        // Если есть overlay (gridOverlay), он уже рисует сетку поверх, поэтому избегаем двойного рендера
        if (this.showGrid) {
            if (!this.gridOverlay && this.gridCanvas) {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.drawImage(this.gridCanvas, 0, 0, this.width, this.height);
            }
        }

        // Preview всегда поверх всего
        if (this.previewCanvas) {
            this.ctx.drawImage(this.previewCanvas, 0, 0, this.width, this.height);
        }

        // Рисуем bounding box для выделенного объекта (только если инструмент select активен)
        if (ToolsManager && ToolsManager.currentTool === 'select' && ToolsManager.selectedObject) {
            this.drawSelectionBox(this.ctx, ToolsManager.selectedObject);
        }
        
        // Сбрасываем композицию
        this.ctx.globalCompositeOperation = 'source-over';
    },

    // Вспомогательная: рисует клетчатый фон для показания прозрачности
    drawCheckerboard(ctx, x, y, width, height, size = 8) {
        const lightColor = '#f0f0f0';
        const darkColor = '#d0d0d0';
        
        for (let i = x; i < x + width; i += size) {
            for (let j = y; j < y + height; j += size) {
                const isEven = ((i / size) + (j / size)) % 2 === 0;
                ctx.fillStyle = isEven ? lightColor : darkColor;
                ctx.fillRect(i, j, Math.min(size, x + width - i), Math.min(size, y + height - j));
            }
        }
    },

    // Метод для получения данных пикселей без интерфейсной сетки (для заливки и ластика)
    // Метод для получения данных пикселей без интерфейсной сетки (для заливки и ластика)
    getRawPixelData() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // ВАЖНО: Для заливки НЕ рисуем фон! Только слои.
        // Заливка должна работать по пикселям слоёв, игнорируя визуальный фон
        
        // Рисуем только содержимое слоёв (без фона)
        this.layers.forEach(layer => {
            if (layer.visible) {
                tempCtx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    },

    // Получить bounding box объекта с учётом поворота
    getObjectBounds(obj) {
        if (!obj) return null;
        
        let minX, minY, maxX, maxY;
        
        if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + obj.width;
            maxY = obj.y + obj.height;
            
            // Если есть угол поворота, пересчитываем bounding box
            if (obj.angle) {
                const centerX = obj.x + obj.width / 2;
                const centerY = obj.y + obj.height / 2;
                const corners = [
                    { x: obj.x, y: obj.y },
                    { x: obj.x + obj.width, y: obj.y },
                    { x: obj.x + obj.width, y: obj.y + obj.height },
                    { x: obj.x, y: obj.y + obj.height }
                ];
                
                // Поворачиваем каждый угол
                const rotatedCorners = corners.map(corner => {
                    const dx = corner.x - centerX;
                    const dy = corner.y - centerY;
                    const cos = Math.cos(obj.angle);
                    const sin = Math.sin(obj.angle);
                    return {
                        x: centerX + dx * cos - dy * sin,
                        y: centerY + dx * sin + dy * cos
                    };
                });
                
                minX = Math.min(...rotatedCorners.map(c => c.x));
                minY = Math.min(...rotatedCorners.map(c => c.y));
                maxX = Math.max(...rotatedCorners.map(c => c.x));
                maxY = Math.max(...rotatedCorners.map(c => c.y));
            }
        } else if (obj.type === 'line') {
            minX = Math.min(obj.x1, obj.x2);
            minY = Math.min(obj.y1, obj.y2);
            maxX = Math.max(obj.x1, obj.x2);
            maxY = Math.max(obj.y1, obj.y2);
        } else if (obj.type === 'path' || obj.type === 'pencil' || obj.type === 'eraser') {
            if (obj.points && obj.points.length > 0) {
                minX = Math.min(...obj.points.map(p => p.x));
                minY = Math.min(...obj.points.map(p => p.y));
                maxX = Math.max(...obj.points.map(p => p.x));
                maxY = Math.max(...obj.points.map(p => p.y));
            } else return null;
        } else if (obj.type === 'polygon') {
            if (obj.points && obj.points.length >= 3) {
                minX = Math.min(...obj.points.map(p => p.x));
                minY = Math.min(...obj.points.map(p => p.y));
                maxX = Math.max(...obj.points.map(p => p.x));
                maxY = Math.max(...obj.points.map(p => p.y));
            } else return null;
        } else if (obj.type === 'text') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + (obj.width || 100);
            maxY = obj.y + (obj.height || 30);
        } else if (obj.type === 'arrow') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + (obj.width || 50);
            maxY = obj.y + (obj.height || 50);
        } else if (obj.type === 'imageData') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + obj.width;
            maxY = obj.y + obj.height;
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        };
    },

    // Нарисовать bounding box и handles для выделенного объекта
    drawSelectionBox(ctx, obj) {
        if (!obj) return;
        
        const bounds = this.getObjectBounds(obj);
        if (!bounds) return;
        
        const handleSize = 8;
        const padding = 4;
        
        ctx.save();
        
        // Рамка выделения
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(bounds.x - padding, bounds.y - padding, bounds.width + padding * 2, bounds.height + padding * 2);
        ctx.setLineDash([]);

        const rotHandleY = bounds.y - padding - 25; // Выносим кружок на 25px вверх
        const rotHandleX = bounds.x + bounds.width / 2; // Строго по центру ширины
        
        // Рисуем линию-антенну
        ctx.beginPath();
        ctx.moveTo(rotHandleX, bounds.y - padding);
        ctx.lineTo(rotHandleX, rotHandleY);
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Рисуем сам кружок, за который будем тянуть
        ctx.beginPath();
        ctx.arc(rotHandleX, rotHandleY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Handles для изменения размера
        const handles = [
            { x: bounds.x - padding, y: bounds.y - padding, cursor: 'nw-resize' },
            { x: bounds.x + bounds.width / 2, y: bounds.y - padding, cursor: 'n-resize' },
            { x: bounds.x + bounds.width + padding, y: bounds.y - padding, cursor: 'ne-resize' },
            { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2, cursor: 'e-resize' },
            { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, cursor: 'se-resize' },
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding, cursor: 's-resize' },
            { x: bounds.x - padding, y: bounds.y + bounds.height + padding, cursor: 'sw-resize' },
            { x: bounds.x - padding, y: bounds.y + bounds.height / 2, cursor: 'w-resize' }
        ];
        
        // Рисуем handles
        ctx.fillStyle = '#0066cc';
        handles.forEach(handle => {
            ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
        
        ctx.restore();
    },

    drawSingleObject(ctx, obj) {
        let targetCtx = ctx;
        let tempCanvas = null;

        // Если у объекта есть локальные вырезы, рисуем его на изолированном холсте
        if (obj.cutouts && obj.cutouts.length > 0) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            targetCtx = tempCanvas.getContext('2d');
            targetCtx.scale(this.pixelRatio, this.pixelRatio);
        }

        // Вызываем ядро отрисовки объекта
        this._drawCore(targetCtx, obj);

        // Применяем вырезы и перекидываем готовый объект на основной слой
        if (tempCanvas) {
            targetCtx.globalCompositeOperation = 'destination-out';
            targetCtx.fillStyle = '#000'; // Важна только альфа
            
            let originX = 0, originY = 0;
            if (['rect', 'circle', 'ellipse', 'text', 'imageData', 'arrow'].includes(obj.type)) {
                originX = obj.x; originY = obj.y;
            } else if (obj.type === 'line') {
                originX = obj.x1; originY = obj.y1;
            } else if (['path', 'pencil', 'eraser', 'polygon'].includes(obj.type)) {
                if (obj.points && obj.points.length > 0) {
                    originX = obj.points[0].x; originY = obj.points[0].y;
                }
            }

            obj.cutouts.forEach(cutout => {
                const absX = originX + cutout.bounds.x;
                const absY = originY + cutout.bounds.y;
                
                targetCtx.save();
                if (cutout.points && cutout.points.length >= 3) {
                    targetCtx.beginPath();
                    targetCtx.moveTo(originX + cutout.points[0].x, originY + cutout.points[0].y);
                    cutout.points.forEach(p => {
                        targetCtx.lineTo(originX + p.x, originY + p.y);
                    });
                    targetCtx.closePath();
                    targetCtx.fill(); 
                } else {
                    targetCtx.fillRect(absX, absY, cutout.bounds.width, cutout.bounds.height);
                }
                targetCtx.restore();
            });

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
        }
    },

    _drawCore(ctx, obj) {
        ctx.save();

        ctx.strokeStyle = obj.strokeColor || '#000000';
        ctx.fillStyle  = obj.fillColor  || 'transparent';
        ctx.lineWidth  = obj.strokeWidth || 2;
        ctx.lineJoin   = 'round';
        ctx.lineCap    = 'round';

        const angle = obj.angle || 0;
        if (angle) {
            const bounds = this.getObjectBounds(obj);
            if (bounds) {
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(angle);
                ctx.translate(-centerX, -centerY);
            }
        }

        if (obj.type === 'path' || obj.type === 'pencil' || obj.type === 'eraser') {
            if (obj.points && obj.points.length > 0) {
                
                if (obj.tool === 'eraser') {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(obj.points[0].x, obj.points[0].y);
                    for (let i = 1; i < obj.points.length; i++) {
                        ctx.lineTo(obj.points[i].x, obj.points[i].y);
                    }
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.stroke();
                    ctx.restore();
                } else {
                    const type = obj.brushType || 'pencil';
                    
                    ctx.save();
                    
                    if (type === 'pencil') {
                        ctx.beginPath();
                        ctx.moveTo(obj.points[0].x, obj.points[0].y);
                        for (let i = 1; i < obj.points.length; i++) {
                            ctx.lineTo(obj.points[i].x, obj.points[i].y);
                        }
                        ctx.stroke();
                        
                    } else if (type === 'brush') {
                        ctx.shadowBlur = ctx.lineWidth / 2;
                        ctx.shadowColor = ctx.strokeStyle;
                        
                        ctx.beginPath();
                        ctx.moveTo(obj.points[0].x, obj.points[0].y);
                        for (let i = 1; i < obj.points.length; i++) {
                            ctx.lineTo(obj.points[i].x, obj.points[i].y);
                        }
                        ctx.stroke();
                        
                    } else if (type === 'marker') {
                        ctx.globalAlpha = 0.4;
                        ctx.lineCap = 'square';
                        
                        ctx.beginPath();
                        ctx.moveTo(obj.points[0].x, obj.points[0].y);
                        for (let i = 1; i < obj.points.length; i++) {
                            ctx.lineTo(obj.points[i].x, obj.points[i].y);
                        }
                        ctx.stroke();
                        
                    } else if (type === 'spray') {
                        ctx.fillStyle = ctx.strokeStyle;
                        const radius = ctx.lineWidth * 2;
                        
                        obj.points.forEach(p => {
                            let MathRandom = Math.sin(p.x + p.y) * 10000;
                            let seed = MathRandom - Math.floor(MathRandom);
                            
                            for (let j = 0; j < 10; j++) {
                                const angle = (seed * j * 77) * Math.PI;
                                const r = (seed * j * 33 % 1) * radius;
                                const splashX = p.x + Math.cos(angle) * r;
                                const splashY = p.y + Math.sin(angle) * r;
                                
                                ctx.fillRect(splashX, splashY, 1.5, 1.5);
                            }
                        });
                    }
                    
                    ctx.restore();
                }
            }        
        } else if (obj.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(obj.x1, obj.y1);
            ctx.lineTo(obj.x2, obj.y2);
            ctx.stroke();
        } else if (obj.type === 'rect') {
            ctx.beginPath();
            ctx.rect(obj.x, obj.y, obj.width, obj.height);
            if (obj.fillColor && obj.fillColor !== 'transparent' && obj.fillColor !== '#00000000') ctx.fill();
            ctx.stroke();
        } else if (obj.type === 'circle' || obj.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(obj.x + obj.width/2, obj.y + obj.height/2, obj.width/2, obj.height/2, 0, 0, Math.PI * 2);
            if (obj.fillColor && obj.fillColor !== 'transparent' && obj.fillColor !== '#00000000') ctx.fill();
            ctx.stroke();
        } else if (obj.type === 'polygon') {
            if (obj.points && obj.points.length >= 3) {
                ctx.beginPath();
                ctx.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) {
                    ctx.lineTo(obj.points[i].x, obj.points[i].y);
                }
                ctx.closePath();

                if (obj.fillColor && obj.fillColor !== 'transparent' && obj.fillColor !== '#00000000') {
                    ctx.fill();
                }
                if (obj.strokeColor) {
                    ctx.stroke();
                }
            }
        } else if (obj.type === 'imageData') {
            if (obj.imageData) {
                if (!obj.cachedImage) {
                    obj.cachedImage = new Image();
                    obj.cachedImage.src = obj.imageData;
                    obj.cachedImage.onload = () => {
                        if (CanvasManager.layers) {
                            for (const layer of CanvasManager.layers) {
                                if (layer.objects && layer.objects.includes(obj)) {
                                    CanvasManager.drawSingleObject(layer.ctx, obj);
                                    break;
                                }
                            }
                        }
                        this.compositeDirty = true;
                        this.redraw();
                    };
                }
                if (obj.cachedImage.complete) {
                    ctx.drawImage(obj.cachedImage, obj.x, obj.y, obj.width, obj.height);
                }
            }
        } else if (obj.type === 'arrow') {
            this.drawArrow(ctx, obj);

        } else if (obj.type === 'text') {
            ctx.save();
            
            let fontString = '';
            if (obj.fontStyle === 'italic') fontString += 'italic ';
            if (obj.fontWeight === 'bold') fontString += 'bold ';
            fontString += `${obj.fontSize || 16}px ${obj.fontFamily || 'Arial Narrow'}`;
            
            ctx.font = fontString;
            ctx.fillStyle = obj.fillColor || '#000000';
            ctx.strokeStyle = obj.strokeColor || '#000000';
            ctx.lineWidth = obj.strokeWidth || 1;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            const metrics = ctx.measureText(obj.text);
            const textWidth = metrics.width;
            const textHeight = (obj.fontSize || 16) * 1.2;
            
            obj.width = textWidth;
            obj.height = textHeight;
            
            let drawX = obj.x;
            let drawY = obj.y;
            
            if (obj.textAlign === 'center') {
                drawX = obj.x + (obj.width / 2) - (textWidth / 2);
            } else if (obj.textAlign === 'right') {
                drawX = obj.x + obj.width - textWidth;
            }
            
            if (obj.strokeColor && obj.strokeColor !== 'transparent' && obj.strokeColor !== '#00000000') {
                ctx.strokeText(obj.text, drawX, drawY);
            }
            
            ctx.fillText(obj.text, drawX, drawY);
            
            if (obj.textDecoration === 'underline') {
                const underlineY = drawY + (obj.fontSize || 16) + 2;
                ctx.beginPath();
                ctx.moveTo(drawX, underlineY);
                ctx.lineTo(drawX + textWidth, underlineY);
                ctx.strokeStyle = obj.fillColor || '#000000';
                ctx.lineWidth = obj.strokeWidth || 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }

        ctx.restore();
    },
    
    drawArrow(ctx, obj) {
        const x = obj.x;
        const y = obj.y;
        const w = obj.width || 50;
        const h = obj.height || 50;
        
        ctx.beginPath();
        
        switch(obj.direction) {
            case 'right':
                ctx.moveTo(x, y);
                ctx.lineTo(x + w - h/2, y);
                ctx.lineTo(x + w - h/2, y - h/4);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w - h/2, y + h + h/4);
                ctx.lineTo(x + w - h/2, y + h);
                ctx.lineTo(x, y + h);
                break;
            case 'left':
                ctx.moveTo(x + w, y);
                ctx.lineTo(x + h/2, y);
                ctx.lineTo(x + h/2, y - h/4);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x + h/2, y + h + h/4);
                ctx.lineTo(x + h/2, y + h);
                ctx.lineTo(x + w, y + h);
                break;
            case 'up':
                ctx.moveTo(x, y + h);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x - w/4, y + h/2);
                ctx.lineTo(x + w/2, y);
                ctx.lineTo(x + w + w/4, y + h/2);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w, y + h);
                break;
            case 'down':
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x - w/4, y + h/2);
                ctx.lineTo(x + w/2, y + h);
                ctx.lineTo(x + w + w/4, y + h/2);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w, y);
                break;
        }
        
        ctx.closePath();
        
        if (obj.fillColor && obj.fillColor !== 'transparent' && obj.fillColor !== '#00000000') {
            ctx.fill();
        }
        ctx.stroke();
    },
    
    exportHighRes(scale = 2) {
        const exCanvas = document.createElement('canvas');
        exCanvas.width  = this.width  * scale * this.pixelRatio;
        exCanvas.height = this.height * scale * this.pixelRatio;
        const exCtx = exCanvas.getContext('2d');

        exCtx.scale(scale * this.pixelRatio, scale * this.pixelRatio);
        
        // Рисуем фон и декоративный узор
        exCtx.fillStyle = this.backgroundColor || '#ffffff'; 
        exCtx.fillRect(0, 0, this.width, this.height);
        this.drawBackgroundPattern(exCtx);

        this.layers.forEach(layer => {
            if (!layer.visible) return;
            exCtx.globalAlpha = layer.opacity;
            exCtx.drawImage(layer.canvas, 0, 0);
        });

        exCtx.globalAlpha = 1;
        return exCanvas;
    },

    clear() {
        this.layers = [];
        this.createCompositeCanvas();
        this.addLayer("Фон");
        this.redraw();
        LayersManager?.updateLayersList();
        HistoryManager?.saveState();
    }
};