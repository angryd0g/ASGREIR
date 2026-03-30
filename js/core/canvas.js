const CanvasManager = {
    canvas: null,
    previewCanvas: null,
    previewCtx: null,
    ctx: null,
    gridCanvas: null,      // Canvas для сетки
    gridCtx: null,         // Контекст для сетки
    layers: [],
    activeLayerIndex: 0,
    width: 1200,
    height: 800,
    pixelRatio: window.devicePixelRatio || 1,
    showGrid: true,        // Показывать ли сетку

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.setupHighResCanvas();

        this.addLayer("Фон");
        this.redraw();

        // Preview-слой
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
        
        // Включаем альфа-композицию для ластика
        this.previewCtx.globalCompositeOperation = 'source-over';
    },
    
    setupHighResCanvas() {
        const container = this.canvas.parentElement;
        this.width = Math.min(1200, container.clientWidth * 0.8);
        this.height = Math.min(800, container.clientHeight * 0.8);

        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        // Пересоздаем canvas сетки при изменении размера
        this.createGridCanvas();

        // Пересоздание слоёв
        this.layers.forEach(layer => {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = this.canvas.width;
            newCanvas.height = this.canvas.height;
            const newCtx = newCanvas.getContext('2d');
            newCtx.scale(this.pixelRatio, this.pixelRatio);
            newCtx.imageSmoothingEnabled = true;
            newCtx.imageSmoothingQuality = 'high';
            
            layer.objects.forEach(obj => this.drawSingleObject(newCtx, obj));
            
            layer.canvas = newCanvas;
            layer.ctx = newCtx;
        });

        // Пересоздание preview
        const oldPreview = this.previewCanvas;
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
        if (oldPreview) this.previewCtx.drawImage(oldPreview, 0, 0);
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
        this.redraw();
        return this.showGrid;
    },

    addLayer(name = null) {
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

        LayersManager?.updateLayersList();
        this.redraw();

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

        // сброс preview
        if (this.previewCanvas) {
            this.previewCanvas.width = this.canvas.width;
            this.previewCanvas.height = this.canvas.height;
            this.previewCtx = this.previewCanvas.getContext('2d');
            this.previewCtx.scale(this.pixelRatio, this.pixelRatio);
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

        // Получаем название объекта
        const typeName = LayersManager.getLayerTypeName(obj.type);
        
        // Создаём новый слой для этого объекта
        const newLayer = this.addLayer(typeName);
        
        // Добавляем объект в новый слой
        newLayer.objects.push(obj);
        
        // Сохраняем информацию об объекте для превью
        newLayer.objectType = obj.type;
        newLayer.needsThumbnailUpdate = true;
        
        // Рисуем объект на слое
        this.drawSingleObject(newLayer.ctx, obj);
        
        // Обновляем основной холст
        this.redraw();
        
        // Обновляем список слоев
        LayersManager?.updateLayersList();
        HistoryManager?.saveState();

        console.log(`Объект ${obj.type} добавлен в новый слой "${newLayer.name}"`);
    },

    redraw() {
        if (!this.ctx) return;

        // Рисуем содержимое слоёв
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Белый фон для прозрачности слоёв
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Рисуем все видимые слои
        this.layers.forEach((layer, index) => {
            if (layer.visible) {
                this.ctx.globalAlpha = layer.opacity;
                this.ctx.drawImage(layer.canvas, 0, 0, this.width, this.height);
            }
        });

        this.ctx.globalAlpha = 1;

        // Рисуем сетку поверх слоёв (не влияет на данные слоёв)
        if (this.showGrid && this.gridCanvas) {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.drawImage(this.gridCanvas, 0, 0, this.width, this.height);
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

    // Метод для получения данных пикселей без сетки (для заливки и ластика)
    getRawPixelData() {
        // Создаем временный canvas только со слоями (без сетки)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.scale(this.pixelRatio, this.pixelRatio);
        
        // Рисуем только содержимое слоёв
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, this.width, this.height);
        
        this.layers.forEach(layer => {
            if (layer.visible) {
                tempCtx.drawImage(layer.canvas, 0, 0, this.width, this.height);
            }
        });
        
        return tempCtx.getImageData(0, 0, this.width, this.height);
    },

    // Получить bounding box объекта
    getObjectBounds(obj) {
        if (!obj) return null;
        
        let minX, minY, maxX, maxY;
        
        if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + obj.width;
            maxY = obj.y + obj.height;
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
            maxY = obj.y + (obj.height || 20);
        } else if (obj.type === 'arrow') {
            minX = obj.x;
            minY = obj.y;
            maxX = obj.x + (obj.width || 50);
            maxY = obj.y + (obj.height || 50);
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
        ctx.save();

        ctx.strokeStyle = obj.strokeColor || '#000000';
        ctx.fillStyle  = obj.fillColor  || 'transparent';
        ctx.lineWidth  = obj.strokeWidth || 2;
        ctx.lineJoin   = 'round';
        ctx.lineCap    = 'round';
        ctx.lineJoin   = 'round';
        ctx.lineCap    = 'round';

        if (obj.type === 'path' || obj.type === 'pencil' || obj.type === 'eraser') {
            if (obj.points && obj.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) {
                    ctx.lineTo(obj.points[i].x, obj.points[i].y);
                }
                if (obj.tool === 'eraser') {
                    // Ластик стирает (делает прозрачными) пиксели
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                } else {
                    ctx.stroke();
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
        } else if (obj.type === 'arrow') {
            this.drawArrow(ctx, obj);
        } else if (obj.type === 'text') {
            ctx.font = `${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`;
            ctx.fillStyle = obj.fillColor || '#000000';
            ctx.fillText(obj.text, obj.x, obj.y + (obj.fontSize || 16));
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
        exCtx.fillStyle = 'white';
        exCtx.fillRect(0, 0, this.width, this.height);

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
        this.addLayer("Фон");
        this.redraw();
        LayersManager?.updateLayersList();
        HistoryManager?.saveState();
    }
};