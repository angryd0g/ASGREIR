const CanvasManager = {
    canvas: null,
    previewCanvas: null,
    previewCtx: null,
    ctx: null,
    layers: [],
    activeLayerIndex: 0,
    width: 1200,
    height: 800,
    pixelRatio: window.devicePixelRatio || 1,

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

        // Пересоздание слоёв
        this.layers.forEach(layer => {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = this.canvas.width;
            newCanvas.height = this.canvas.height;
            const newCtx = newCanvas.getContext('2d');
            newCtx.scale(this.pixelRatio, this.pixelRatio);
            newCtx.imageSmoothingEnabled = true;
            newCtx.imageSmoothingQuality = 'high';
            
            // Пересоздаём содержимое путем перерисовки всех объектов
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

    // Создать новый проект с заданными размерами и очистить все слои
    newProject(width, height) {
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));

        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

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
        if (!obj || !this.activeLayer) {
            console.warn('Нет активного слоя или пустой объект');
            return;
        }

        this.activeLayer.objects.push(obj);

        // Очищаем и перерисовываем все объекты слоя
        this.activeLayer.ctx.clearRect(0, 0, this.width, this.height);
        this.activeLayer.objects.forEach(o => this.drawSingleObject(this.activeLayer.ctx, o));

        this.redraw();
        LayersManager?.updateLayersList();
        HistoryManager?.saveState();

        console.log(`Объект ${obj.type} добавлен в слой "${this.activeLayer.name}"`);
        console.log('После добавления: объектов в слое', this.activeLayer.objects.length);
    },

    redraw() {
        if (!this.ctx) return;

        // Всегда рисуем белый фон, независимо от состояния слоев
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawGrid();

        // Убеждаемся, что первый слой (Фон) всегда виден
        this.layers.forEach((layer, index) => {
            if (index === 0) {
                // Первый слой (Фон) всегда видим
                this.ctx.globalAlpha = layer.opacity;
                this.ctx.drawImage(layer.canvas, 0, 0, this.width, this.height);
            } else if (layer.visible) {
                // Остальные слои показываются только если видимы
                this.ctx.globalAlpha = layer.opacity;
                this.ctx.drawImage(layer.canvas, 0, 0, this.width, this.height);
            }
        });

        this.ctx.globalAlpha = 1;

        // Preview всегда поверх всего
        if (this.previewCanvas) {
            this.ctx.drawImage(this.previewCanvas, 0, 0, this.width, this.height);
        }
    },

    drawGrid() {
        const ctx = this.ctx;
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
           
    drawSingleObject(ctx, obj) {
        ctx.save();

        ctx.strokeStyle = obj.strokeColor || '#000000';
        ctx.fillStyle  = obj.fillColor  || 'transparent';
        ctx.lineWidth  = obj.strokeWidth || 2;
        ctx.lineJoin   = 'round';
        ctx.lineCap    = 'round';

        // ── здесь вся твоя логика отрисовки разных типов ──
        if (obj.type === 'path' || obj.type === 'pencil' || obj.type === 'eraser') {
            if (obj.points && obj.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) {
                    ctx.lineTo(obj.points[i].x, obj.points[i].y);
                }
                ctx.stroke();
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

        if (obj.fillColor) {
            ctx.fillStyle = obj.fillColor;
            ctx.fill();
        }
        if (obj.strokeColor) {
            ctx.strokeStyle = obj.strokeColor;
            ctx.lineWidth = obj.strokeWidth || 2;
            ctx.stroke();
        }
    }
        } else if (obj.type === 'arrow') {
            this.drawArrow(ctx, obj);
        } else if (obj.type === 'text') {
            ctx.font = `${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`;
            ctx.fillStyle = obj.fillColor || '#000000';
            ctx.fillText(obj.text, obj.x, obj.y + (obj.fontSize || 16));
        } else if (obj.type === 'imageData') {
            // Используем кешированное изображение для избежания проблем с асинхронной загрузкой
            if (obj.cachedImage && obj.cachedImage.complete) {
                ctx.drawImage(obj.cachedImage, 0, 0, this.width, this.height);
            }
        }

        ctx.restore();
    },
    
    // Метод для рисования стрелок
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