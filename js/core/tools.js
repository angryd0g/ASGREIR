// Управление инструментами
const ToolsManager = {
    currentTool: 'select',
    strokeColor: '#000000',
    fillColor: '#4a90e2',
    strokeWidth: 2,
    fontSize: 16,
    isDrawing: false,
    isMoving: false,              // флаг перемещения выделенного объекта
    isResizing: false,            // флаг изменения размера
    resizingHandle: null,         // какой handle используется для resize
    moveStartX: 0,                // начальная позиция мыши при перемещении
    moveStartY: 0,                // начальная позиция мыши при перемещении
    moveObjectStartX: 0,          // начальная позиция объекта
    moveObjectStartY: 0,          // начальная позиция объекта
    objectStartBounds: null,      // исходные границы объекта при resize
    moveObjectSnapshot: null,     // снимок объекта при начале перемещения
    startX: 0,
    startY: 0,
    textInput: null,
    selectedObject: null,
    allObjectsSelected: false,    // флаг для "выбрать все"
    selectedObjects: [],          // массив всех выбранных объектов
    currentPath: null,
    
    init() {
        this.setupTools();
        this.setupProperties();
        this.setupTextInput();
        this.setupCollapsibleSections(); // Добавляем инициализацию сворачивания
    },
    
    setupTools() {
        // Обработка основных инструментов
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activateTool(btn);
            });
        });
        
        // Обработка кнопок фигур
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activateTool(btn);
            });
        });
    },
    
    activateTool(btn) {
        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.tool-btn, .shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
        
        // Показываем/скрываем настройки размера текста
        const fontSizeGroup = document.getElementById('font-size-group');
        if (fontSizeGroup) {
            fontSizeGroup.style.display = this.currentTool === 'text' ? 'block' : 'none';
        }
        
        // Снимаем выделение при смене инструмента
        if (this.currentTool !== 'select') {
            this.selectedObject = null;
        }
    },
    
    setupProperties() {
        const strokeColorInput = document.getElementById('stroke-color');
        if (strokeColorInput) {
            strokeColorInput.addEventListener('change', (e) => {
                this.strokeColor = e.target.value;
                const colorValue = document.querySelector('.color-input .color-value');
                if (colorValue) colorValue.textContent = this.strokeColor;
            });
        }
        
        const fillColorInput = document.getElementById('fill-color');
        if (fillColorInput) {
            fillColorInput.addEventListener('change', (e) => {
                this.fillColor = e.target.value;
            });
        }
        
        const strokeWidthInput = document.getElementById('stroke-width');
        if (strokeWidthInput) {
            strokeWidthInput.addEventListener('input', (e) => {
                this.strokeWidth = parseInt(e.target.value);
                const strokeValue = document.getElementById('stroke-width-value');
                if (strokeValue) strokeValue.textContent = this.strokeWidth + 'px';
            });
        }
        
        const fontSizeInput = document.getElementById('font-size');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', (e) => {
                this.fontSize = parseInt(e.target.value);
                const fontSizeValue = document.getElementById('font-size-value');
                if (fontSizeValue) fontSizeValue.textContent = this.fontSize + 'px';
            });
        }
    },
    
    setupTextInput() {
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.className = 'text-input-temp';
        this.textInput.style.position = 'absolute';
        this.textInput.style.display = 'none';
        this.textInput.style.zIndex = '1000';
        this.textInput.style.padding = '4px 8px';
        this.textInput.style.fontFamily = 'Arial, sans-serif';
        this.textInput.style.border = '2px solid var(--accent)';
        this.textInput.style.borderRadius = '4px';
        this.textInput.style.outline = 'none';
        this.textInput.style.background = 'white';
        this.textInput.style.color = 'black';
        
        document.body.appendChild(this.textInput);
        
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishTextInput();
            } else if (e.key === 'Escape') {
                this.cancelTextInput();
            }
        });
        
        this.textInput.addEventListener('blur', () => {
            this.finishTextInput();
        });
    },
    
    setupCollapsibleSections() {
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const sectionId = header.dataset.toggle;
                const content = document.getElementById(sectionId);
                const icon = header.querySelector('.toggle-icon');
                
                if (content) {
                    header.classList.toggle('collapsed');
                    content.classList.toggle('collapsed');
                    
                    if (icon) {
                        icon.style.transform = header.classList.contains('collapsed') 
                            ? 'rotate(-90deg)' 
                            : 'rotate(0deg)';
                    }
                    
                    try {
                        localStorage.setItem(sectionId, header.classList.contains('collapsed'));
                    } catch (e) {
                        console.log('localStorage not available');
                    }
                }
            });
            
            // Восстанавливаем состояние
            try {
                const sectionId = header.dataset.toggle;
                const wasCollapsed = localStorage.getItem(sectionId) === 'true';
                
                if (wasCollapsed) {
                    const content = document.getElementById(sectionId);
                    header.classList.add('collapsed');
                    content.classList.add('collapsed');
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) icon.style.transform = 'rotate(-90deg)';
                } else if (window.innerWidth < 768) {
                    // На мобильных устройствах сворачиваем по умолчанию
                    const content = document.getElementById(sectionId);
                    header.classList.add('collapsed');
                    content.classList.add('collapsed');
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) icon.style.transform = 'rotate(-90deg)';
                    localStorage.setItem(sectionId, 'true');
                }
            } catch (e) {
                console.log('localStorage not available');
            }
        });
    },
    
    updateCollapsibleForScreenSize() {
        const isMobile = window.innerWidth < 768;
        document.querySelectorAll('.section-header').forEach(header => {
            const sectionId = header.dataset.toggle;
            const content = document.getElementById(sectionId);
            const icon = header.querySelector('.toggle-icon');
            
            try {
                const wasCollapsed = localStorage.getItem(sectionId) === 'true';
                
                if (isMobile && !wasCollapsed) {
                    // На мобильных сворачиваем, если не сохранено состояние
                    header.classList.add('collapsed');
                    content.classList.add('collapsed');
                    if (icon) icon.style.transform = 'rotate(-90deg)';
                }
            } catch (e) {
                console.log('localStorage not available');
            }
        });
    },
    
    startDrawing(x, y) {
        if (this.currentTool === 'select') {
            // Если уже выбран объект, проверяем нажали ли на handle
            if (this.selectedObject) {
                const handle = this.getHandleAtPoint(x, y, this.selectedObject);
                if (handle) {
                    // Начинаем resize
                    this.isResizing = true;
                    this.resizingHandle = handle;
                    this.moveStartX = x;
                    this.moveStartY = y;
                    this.objectStartBounds = CanvasManager.getObjectBounds(this.selectedObject);
                    console.log('startDrawing: начало resize, handle=', handle);
                    return false;
                }
            }
            
            // Проверяем нажали ли на выделенный объект для перемещения
            const objAtClick = this.findObjectAt(x, y);
            console.log('startDrawing select: объект найден?', !!objAtClick, 'выбранный объект=', !!this.selectedObject, 'совпадает?', objAtClick === this.selectedObject);
            
            if (objAtClick && objAtClick === this.selectedObject) {
                // Уже выделен, начинаем перемещение
                this.isMoving = true;
                this.isResizing = false; // Убедимся, что resize не активен
                this.moveStartX = x;
                this.moveStartY = y;
                
                // Используем bounds для получения начальной позиции объекта
                const bounds = CanvasManager.getObjectBounds(objAtClick);
                if (bounds) {
                    this.moveObjectStartX = bounds.x;
                    this.moveObjectStartY = bounds.y;
                } else {
                    this.moveObjectStartX = objAtClick.x || 0;
                    this.moveObjectStartY = objAtClick.y || 0;
                }
                
                // Сохраняем снимок объекта для правильного перемещения
                this.moveObjectSnapshot = JSON.parse(JSON.stringify(objAtClick));
                
                console.log('startDrawing: начало MOVE, координаты:', { moveStartX: x, moveStartY: y, boundsX: this.moveObjectStartX, boundsY: this.moveObjectStartY });
            } else {
                // Выделяем новый объект
                console.log('startDrawing select: ВЫБИРАЕМ новый объект', !!objAtClick);
                this.selectedObject = objAtClick;
                this.isMoving = false;
                this.isResizing = false;
                CanvasManager.redraw();
            }
            return false;
        }
        
        if (this.currentTool === 'text') {
            this.startTextInput(x, y);
            return false;
        }
        
        if (this.currentTool === 'fill') {
            this.performFill(x, y);
            return false;
        }
        
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        
        if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
            // Очищаем preview для нового рисования
            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            }
            
            // Создаем объект, но НЕ добавляем его в слой - будет добавлен при stopDrawing
            this.currentPath = {
                type: 'path',
                points: [{x, y}],
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                tool: this.currentTool
            };
        }
        
        return true;
    },
    
    drawTemporary(ctx, x, y) {
        if (!this.isDrawing && !this.isMoving && !this.isResizing) return;
        
        // Для select инструмента - перемещение объекта
        if (this.currentTool === 'select' && this.isMoving && this.selectedObject) {
            if (!this.moveObjectSnapshot) return;
            
            const deltaX = x - this.moveStartX;
            const deltaY = y - this.moveStartY;
            
            console.log('drawTemporary MOVE: delta=', { deltaX, deltaY }, 'объект тип=', this.selectedObject.type);
            
            // Восстанавливаем исходное состояние из snapshot и применяем смещение
            const snapshot = this.moveObjectSnapshot;
            
            // Перемещаем объект в зависимости от его типа
            if (snapshot.type === 'path' || snapshot.type === 'pencil' || snapshot.type === 'eraser') {
                // Для путей - копируем точки из snapshot и смещаем
                if (snapshot.points && snapshot.points.length > 0) {
                    this.selectedObject.points = snapshot.points.map(p => ({
                        x: p.x + deltaX,
                        y: p.y + deltaY
                    }));
                }
            } else if (snapshot.type === 'polygon') {
                // Для полигонов - копируем точки из snapshot и смещаем
                if (snapshot.points && snapshot.points.length > 0) {
                    this.selectedObject.points = snapshot.points.map(p => ({
                        x: p.x + deltaX,
                        y: p.y + deltaY
                    }));
                }
            } else if (snapshot.type === 'line' || snapshot.type === 'arrow') {
                // Для линий - копируем координаты из snapshot и смещаем
                this.selectedObject.x1 = (snapshot.x1 || 0) + deltaX;
                this.selectedObject.y1 = (snapshot.y1 || 0) + deltaY;
                this.selectedObject.x2 = (snapshot.x2 || 0) + deltaX;
                this.selectedObject.y2 = (snapshot.y2 || 0) + deltaY;
            } else {
                // Для остальных (rect, circle, text, и т.д.) - копируем из snapshot и смещаем
                if (snapshot.x !== undefined) {
                    this.selectedObject.x = this.moveObjectStartX + deltaX;
                }
                if (snapshot.y !== undefined) {
                    this.selectedObject.y = this.moveObjectStartY + deltaY;
                }
            }
            
            // Перерисовываем слой без очистки
            this.updateObjectInLayer(this.selectedObject);
            CanvasManager.redraw();
            return;
        }
        
        // Для select инструмента - изменение размера объекта
        if (this.currentTool === 'select' && this.isResizing && this.selectedObject && this.objectStartBounds) {
            const deltaX = x - this.moveStartX;
            const deltaY = y - this.moveStartY;
            const bounds = this.objectStartBounds;
            let newBounds = { ...bounds };
            
            const handleResizeOffset = 8; // минимальный размер
            
            if (this.resizingHandle.includes('w')) {
                newBounds.minX = Math.min(bounds.minX + deltaX, bounds.maxX - handleResizeOffset);
            }
            if (this.resizingHandle.includes('e')) {
                newBounds.maxX = Math.max(bounds.maxX + deltaX, bounds.minX + handleResizeOffset);
            }
            if (this.resizingHandle.includes('n')) {
                newBounds.minY = Math.min(bounds.minY + deltaY, bounds.maxY - handleResizeOffset);
            }
            if (this.resizingHandle.includes('s')) {
                newBounds.maxY = Math.max(bounds.maxY + deltaY, bounds.minY + handleResizeOffset);
            }
            
            // Применяем новые размеры к объекту
            this.applyBoundsToObject(this.selectedObject, newBounds);
            
            // Перерисовываем слой
            this.updateObjectInLayer(this.selectedObject);
            CanvasManager.redraw();
            return;
        }
        
        if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
            // Для карандаша используем инкрементальную отрисовку
            this.drawTemporaryIncremental(ctx, x, y);
            return;
        }
        
        // Используем ShapesManager для временного рисования
        ShapesManager.drawTemporary(
            ctx, 
            this.currentTool, 
            this.startX, 
            this.startY, 
            x, 
            y, 
            this.strokeColor, 
            this.fillColor, 
            this.strokeWidth
        );
    },
    
    drawTemporaryIncremental(ctx, x, y) {
        if (!this.isDrawing) return;
        
        if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
            if (this.currentPath) {
                const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
                const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
                
                if (distance > 2) {
                    ctx.lineWidth = this.currentPath.strokeWidth;
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    
                    if (this.currentTool === 'eraser') {
                        // Для ластика: показываем полупрозрачный белый штрих (preview стирания)
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.beginPath();
                        ctx.moveTo(lastPoint.x, lastPoint.y);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    } else {
                        // Для карандаша: обычный цветной штрих
                        ctx.strokeStyle = this.currentPath.strokeColor;
                        ctx.beginPath();
                        ctx.moveTo(lastPoint.x, lastPoint.y);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                    
                    // Добавляем точку к пути
                    this.currentPath.points.push({x, y});
                }
            }
        }
    },
    
    stopDrawing(x, y) {
    console.log('stopDrawing вызван, isDrawing=', this.isDrawing, 'tool=', this.currentTool);
    
    // Завершение перемещения объекта
    if (this.isMoving) {
        this.isMoving = false;
        this.moveObjectSnapshot = null; // Очищаем снимок
        HistoryManager?.saveState();
        return null;
    }
    
    // Завершение изменения размера объекта
    if (this.isResizing) {
        this.isResizing = false;
        this.resizingHandle = null;
        this.objectStartBounds = null;
        HistoryManager?.saveState();
        return null;
    }
    
    if (!this.isDrawing) {
        console.log('Рисование не активно, выходим');
        return null;
    }
    
    let obj = null;
    
    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
        console.log('Обработка карандаша/ластика');
        if (this.currentPath && this.currentPath.points.length > 1) {
            obj = this.currentPath;
            console.log('Создан путь с точками:', this.currentPath.points.length);
        } else {
            console.log('Путь слишком короткий');
        }
        this.currentPath = null;
    } else {
        // Используем ShapesManager для создания фигуры
        console.log('Создаем фигуру через ShapesManager, инструмент:', this.currentTool);
        
        try {
            obj = ShapesManager.createShape(
                this.currentTool,
                this.startX,
                this.startY,
                x,
                y,
                this.strokeColor,
                this.fillColor,
                this.strokeWidth
            );
            
            console.log('Результат createShape:', obj ? 'объект создан' : 'null', obj);
            
        } catch (error) {
            console.error('Ошибка при создании фигуры:', error);
            obj = null;
        }
        
        // ========== ЗДЕСЬ ЗАМЕНЯЕМ КОД ==========
        if (obj) {
            console.log('СОЗДАН ОБЪЕКТ ТИПА:', obj.type);
            
            // Добавляем объект через CanvasManager.addObject (который создаст новый слой)
            if (CanvasManager && CanvasManager.addObject) {
                CanvasManager.addObject(obj);
                console.log('Объект ДОБАВЛЕН в новый слой. Тип:', obj.type);
            } else {
                // Fallback если addObject не существует
                console.warn('CanvasManager.addObject не найден, использую старый метод');
                if (CanvasManager && CanvasManager.objects) {
                    CanvasManager.objects.push(obj);
                    CanvasManager.redraw();
                }
            }
        } else {
            console.log('Объект НЕ создан');
        }
        // ========== КОНЕЦ ЗАМЕНЫ ==========
    }
    
    this.isDrawing = false;
    console.log('Рисование завершено, возвращаем obj:', obj ? 'да' : 'нет');
    
    return obj;
},
    
    findObjectAt(x, y) {
        // Проверяем наличие объектов через CanvasManager
        let objects = [];

        if (CanvasManager.objects && Array.isArray(CanvasManager.objects)) {
            objects = CanvasManager.objects;
        } else if (CanvasManager.layers && Array.isArray(CanvasManager.layers)) {
            // Собираем из всех видимых слоёв, если объекты хранятся по слоям
            for (let layer of CanvasManager.layers) {
                if (layer && Array.isArray(layer.objects)) {
                    objects = objects.concat(layer.objects);
                }
            }
        }

        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];

            if (!obj) continue;

            if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
                if (x >= obj.x && x <= obj.x + obj.width && 
                    y >= obj.y && y <= obj.y + obj.height) {
                    return obj;
                }
            } else if (obj.type === 'line') {
                const distance = this.distanceToLine(x, y, obj.x1, obj.y1, obj.x2, obj.y2);
                if (distance < 10) return obj;
            } else if (obj.type === 'path') {
                for (let j = 0; j < obj.points.length - 1; j++) {
                    const distance = this.distanceToLine(x, y, 
                        obj.points[j].x, obj.points[j].y, 
                        obj.points[j+1].x, obj.points[j+1].y);
                    if (distance < 10) return obj;
                }
            } else if (obj.type === 'text') {
                if (x >= obj.x && x <= obj.x + obj.width && 
                    y >= obj.y && y <= obj.y + obj.height) {
                    return obj;
                }
            } else if (obj.type === 'polygon' && obj.points) {
                if (this.isPointInPolygon(x, y, obj.points)) {
                    return obj;
                }
            } else if (obj.type === 'arrow') {
                if (x >= obj.x && x <= obj.x + obj.width && 
                    y >= obj.y && y <= obj.y + obj.height) {
                    return obj;
                }
            }
        }
        return null;
    },
    
    isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    },
    
    distanceToLine(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        
        if (len_sq !== 0) param = dot / len_sq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    performFill(x, y) {
        if (!CanvasManager.activeLayer) return;
        
        // Шаг 1: Создаем справочный canvas со ВСЕМИ слоями (БЕЗ фона и сетки!)
        const referenceCanvas = document.createElement('canvas');
        referenceCanvas.width = CanvasManager.canvas.width;
        referenceCanvas.height = CanvasManager.canvas.height;
        // при чтении большого объёма пикселей включаем willReadFrequently
        const referenceCtx = referenceCanvas.getContext('2d', { willReadFrequently: true });
        referenceCtx.scale(CanvasManager.pixelRatio, CanvasManager.pixelRatio);
        
        // Важно: НЕ рисуем белый фон, оставляем canvas прозрачным!
        // Рисуем ВСЕ видимые слои (как они есть, со своими пиксельными данными)
        CanvasManager.layers.forEach((layer, index) => {
            if (index === 0 || layer.visible) {
                referenceCtx.globalAlpha = layer.opacity;
                // Копируем ТОЛЬКО пиксельные данные слоя, без изменений
                referenceCtx.drawImage(layer.canvas, 0, 0, CanvasManager.width, CanvasManager.height);
            }
        });
        referenceCtx.globalAlpha = 1;
        
        // Логические координаты
        const logicalX = Math.round(x);
        const logicalY = Math.round(y);
        
        // Получаем цвет пикселя в справочном canvas
        const pixelData = referenceCtx.getImageData(logicalX, logicalY, 1, 1).data;
        const startColor = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
            a: pixelData[3]
        };
        
        const fillRGB = this.hexToRgb(this.fillColor);
        
        // Если цвет совпадает, ничего не делаем
        if (startColor.r === fillRGB.r && startColor.g === fillRGB.g && 
            startColor.b === fillRGB.b) return;
        
        // Шаг 2: Выполняем flood fill на справочном canvas, получаем маску
        // убедимся, что передаём целые положительные размеры
        const w = Math.max(0, Math.floor(CanvasManager.width));
        const h = Math.max(0, Math.floor(CanvasManager.height));
        const fillMask = this.floodFillGetMask(referenceCtx, logicalX, logicalY, startColor, w, h);
        
        // Шаг 3: Применяем маску к активному слою
        const layerImageData = CanvasManager.activeLayer.ctx.getImageData(0, 0, CanvasManager.width, CanvasManager.height);
        const layerData = layerImageData.data;
        
        for (let i = 0; i < fillMask.length; i++) {
            if (fillMask[i]) {  // Если пиксель помечен для заливки
                layerData[i * 4] = fillRGB.r;
                layerData[i * 4 + 1] = fillRGB.g;
                layerData[i * 4 + 2] = fillRGB.b;
                layerData[i * 4 + 3] = 255;
            }
        }
        
        CanvasManager.activeLayer.ctx.putImageData(layerImageData, 0, 0);
        
        CanvasManager.redraw();
        HistoryManager?.saveState();
    },

    // Выбрать все объекты на холсте
    selectAllObjects() {
        this.selectedObjects = [];
        CanvasManager.layers.forEach(layer => {
            if (layer.visible) {
                this.selectedObjects.push(...layer.objects);
            }
        });
        this.allObjectsSelected = this.selectedObjects.length > 0;
        CanvasManager.redraw();
        return this.selectedObjects;
    },

    // Обновить позицию объекта в слое
    updateObjectInLayer(obj) {
    for (let i = 0; i < CanvasManager.layers.length; i++) {
        const layer = CanvasManager.layers[i];
        const index = layer.objects.indexOf(obj);
        if (index !== -1) {
            // Перерисовываем только этот слой
            layer.ctx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            layer.objects.forEach(o => CanvasManager.drawSingleObject(layer.ctx, o));
            
            // Помечаем слой для обновления миниатюры
            LayersManager.invalidateLayerThumbnail(i);
            break;
        }
    }
},
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },
    
    floodFillGetMask(ctx, startX, startY, startColor, width, height) {
        // защититесь от деструктивных значений
        width = Math.max(0, Math.floor(width));
        height = Math.max(0, Math.floor(height));
        if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
            return [];
        }
        
        // убедимся, что точки начала внутри области
        if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
            return [];
        }
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Создаем маску - boolean array, где true = нужно заполнить пиксель
        const mask = new Array(width * height).fill(false);
        
        const queue = [{x: startX, y: startY}];
        const visited = new Set();
        
        // Если кликнули на прозрачный пиксель, заливаем прозрачность
        // Если кликнули на цветной пиксель, заливаем цвет
        const isTransparent = startColor.a < 128;
        
        const isSameColor = (idx) => {
            if (idx < 0 || idx >= data.length - 3) return false;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            
            // Если стартовый цвет прозрачный, заливаем все прозрачные пиксели
            if (isTransparent) {
                return a < 128;
            }
            
            // Иначе, заливаем только похожие цвета с учетом толерантности
            if (a < 128) return false; // Не заливаем через прозрачность
            
            const tolerance = 40;
            const colorDiff = Math.sqrt(
                Math.pow(r - startColor.r, 2) +
                Math.pow(g - startColor.g, 2) +
                Math.pow(b - startColor.b, 2)
            );
            
            return colorDiff <= tolerance;
        };
        
        let pixelsChanged = 0;
        const maxPixels = width * height;
        
        while (queue.length > 0 && pixelsChanged < maxPixels) {
            const {x, y} = queue.shift();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            
            const index = (y * width + x) * 4;
            
            if (!isSameColor(index)) continue;
            
            visited.add(key);
            
            // Помечаем пиксель в маске
            mask[y * width + x] = true;
            pixelsChanged++;
            
            // 8-связная заливка
            queue.push({x: x + 1, y});
            queue.push({x: x - 1, y});
            queue.push({x, y: y + 1});
            queue.push({x, y: y - 1});
            queue.push({x: x + 1, y: y + 1});
            queue.push({x: x - 1, y: y - 1});
            queue.push({x: x + 1, y: y - 1});
            queue.push({x: x - 1, y: y + 1});
        }
        
        return mask;
    },
    
    floodFill(ctx, startX, startY, startColor, fillColor, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const queue = [{x: startX, y: startY}];
        const visited = new Set();
        let tolerance = 40;
        
        const isSameColor = (idx) => {
            if (idx < 0 || idx >= data.length - 3) return false;
            
            const a = data[idx + 3];
            if (a < 200) return false;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            const colorDiff = Math.sqrt(
                Math.pow(r - startColor.r, 2) +
                Math.pow(g - startColor.g, 2) +
                Math.pow(b - startColor.b, 2)
            );
            
            return colorDiff <= tolerance;
        };
        
        let pixelsChanged = 0;
        const maxPixels = width * height;
        
        while (queue.length > 0 && pixelsChanged < maxPixels) {
            const {x, y} = queue.shift();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            
            const index = (y * width + x) * 4;
            
            if (!isSameColor(index)) continue;
            
            visited.add(key);
            
            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = 255;
            
            pixelsChanged++;
            
            queue.push({x: x + 1, y});
            queue.push({x: x - 1, y});
            queue.push({x, y: y + 1});
            queue.push({x, y: y - 1});
            queue.push({x: x + 1, y: y + 1});
            queue.push({x: x - 1, y: y - 1});
            queue.push({x: x + 1, y: y - 1});
            queue.push({x: x - 1, y: y + 1});
        }
        
        ctx.putImageData(imageData, 0, 0);
    },
    
    startTextInput(x, y) {
        this.textInput.style.left = (x + 10) + 'px';
        this.textInput.style.top = (y + 10) + 'px';
        this.textInput.style.display = 'block';
        this.textInput.style.fontSize = this.fontSize + 'px';
        this.textInput.value = '';
        this.textInput.focus();
        
        this.textInputX = x;
        this.textInputY = y;
    },
    
    finishTextInput() {
        const text = this.textInput.value.trim();
        if (text && text.length > 0) {
            const obj = {
                type: 'text',
                text: text,
                x: this.textInputX,
                y: this.textInputY,
                fontSize: this.fontSize,
                fontFamily: 'Arial',
                strokeColor: this.strokeColor,
                fillColor: this.fillColor,
                width: text.length * this.fontSize * 0.6,
                height: this.fontSize * 1.2
            };
            
            CanvasManager.addObject(obj);
        }
        
        this.cancelTextInput();
    },
    
    cancelTextInput() {
        this.textInput.style.display = 'none';
        this.textInput.value = '';
    },
    
    colorToHex(rgb) {
        return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
    },
    
    getHandleAtPoint(x, y, obj) {
        const bounds = CanvasManager.getObjectBounds(obj);
        const handleSize = 10; // размер области клика вокруг handle
        
        if (!bounds) return null;
        
        // Координаты всех 8 handle'ов
        const handles = {
            'nw': { x: bounds.minX, y: bounds.minY },
            'n': { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
            'ne': { x: bounds.maxX, y: bounds.minY },
            'e': { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
            'se': { x: bounds.maxX, y: bounds.maxY },
            's': { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
            'sw': { x: bounds.minX, y: bounds.maxY },
            'w': { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 }
        };
        
        // Проверяем расстояние до каждого handle'а
        for (const [name, pos] of Object.entries(handles)) {
            const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (dist <= handleSize) {
                return name;
            }
        }
        
        return null;
    },
    
    applyBoundsToObject(obj, newBounds) {
        const oldBounds = CanvasManager.getObjectBounds(obj);
        if (!oldBounds) return;
        
        const oldWidth = oldBounds.maxX - oldBounds.minX;
        const oldHeight = oldBounds.maxY - oldBounds.minY;
        const newWidth = newBounds.maxX - newBounds.minX;
        const newHeight = newBounds.maxY - newBounds.minY;
        
        // Предотвращаем деление на ноль
        const scaleX = oldWidth !== 0 ? newWidth / oldWidth : 1;
        const scaleY = oldHeight !== 0 ? newHeight / oldHeight : 1;
        
        // Применяем трансформацию в зависимости от типа объекта
        if (obj.type === 'rect' || obj.type === 'ellipse' || obj.type === 'circle') {
            obj.x = newBounds.minX;
            obj.y = newBounds.minY;
            obj.width = newWidth;
            obj.height = newHeight;
        } else if (obj.type === 'line' || obj.type === 'arrow') {
            // Масштабируем координаты линии относительно старых границ
            obj.x1 = newBounds.minX + (obj.x1 - oldBounds.minX) * scaleX;
            obj.y1 = newBounds.minY + (obj.y1 - oldBounds.minY) * scaleY;
            obj.x2 = newBounds.minX + (obj.x2 - oldBounds.minX) * scaleX;
            obj.y2 = newBounds.minY + (obj.y2 - oldBounds.minY) * scaleY;
        } else if (obj.type === 'polygon') {
            // Масштабируем и смещаем точки многоугольника
            if (obj.points && obj.points.length > 0) {
                obj.points = obj.points.map(p => ({
                    x: newBounds.minX + (p.x - oldBounds.minX) * scaleX,
                    y: newBounds.minY + (p.y - oldBounds.minY) * scaleY
                }));
            }
        } else if (obj.type === 'path') {
            // Масштабируем и смещаем точки пути
            if (obj.points && obj.points.length > 0) {
                obj.points = obj.points.map(p => ({
                    x: newBounds.minX + (p.x - oldBounds.minX) * scaleX,
                    y: newBounds.minY + (p.y - oldBounds.minY) * scaleY
                }));
            }
        } else if (obj.type === 'text') {
            obj.x = newBounds.minX;
            obj.y = newBounds.minY;
            // Масштабируем размер шрифта
            if (obj.fontSize) {
                obj.fontSize = Math.max(8, obj.fontSize * Math.max(scaleX, scaleY));
            }
        }
    }
};