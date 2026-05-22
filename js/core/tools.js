const ToolsManager = {
    isDrawingTextArea: false,
    textAreaStartX: 0,
    textAreaStartY: 0,
    textAreaWidth: 0,
    textAreaHeight: 0,
    textAreaObject: null,
    currentTool: 'select',
    strokeColor: '#000000',
    fillColor: '#4a90e2',
    strokeWidth: 2,
    fontSize: 16,
    isDrawing: false,
    isMoving: false,              
    isResizing: false,            
    resizingHandle: null,         
    moveStartX: 0,               
    moveStartY: 0,                
    moveObjectStartX: 0,  
    moveObjectStartY: 0,         
    objectStartBounds: null,     
    moveObjectSnapshot: null,   
    startX: 0,
    startY: 0,
    textInput: null,
    textInputX: 0,
    textInputY: 0,
    editingTextObject: null,
    selectedObject: null,
    allObjectsSelected: false,    
    selectedObjects: [],       
    currentPath: null,
    fontFamily: 'Arial Narrow',
    textValue: '',
    fontWeight: 'normal',
    fontStyle: 'normal',   
    textDecoration: 'none', 
    textAlign: 'left', 
    
    init() {
        this.setupTools();
        this.setupProperties();
        this.setupTextInput();
        this.setupCollapsibleSections();
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
            document.querySelectorAll('.tool-btn, .shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTool = btn.dataset.tool;
            
            // Показываем/скрываем настройки текста
            const textProperties = document.getElementById('text-properties');
            const fontSizeGroup = document.getElementById('font-size-group');
            
            if (textProperties) {
                // Показываем полные настройки текста только когда выбран текст
                if (this.selectedObject && this.selectedObject.type === 'text') {
                    textProperties.style.display = 'block';
                } else {
                    textProperties.style.display = 'none';
                }
            }
            
            if (fontSizeGroup) {
                fontSizeGroup.style.display = this.currentTool === 'text' ? 'block' : 'none';
            }
            
            if (this.currentTool === 'text') {
                this.selectedObject = null;
                CanvasManager.redraw();
            }
            
            if (this.currentTool !== 'select') {
                this.selectedObject = null;
            }
        },

        updateTextPropertiesPanel() {
            const textProperties = document.getElementById('text-properties');
            if (!textProperties) return;
            
            if (this.selectedObject && this.selectedObject.type === 'text') {
                const obj = this.selectedObject;
                
                // Загружаем значения из объекта
                this.fontSize = obj.fontSize || 14;
                this.fontFamily = obj.fontFamily || 'Arial Narrow';
                this.fontWeight = obj.fontWeight || 'normal';
                this.fontStyle = obj.fontStyle || 'normal';
                this.textDecoration = obj.textDecoration || 'none';
                this.textAlign = obj.textAlign || 'left';
                this.fillColor = obj.fillColor || '#000000';
                this.strokeColor = obj.strokeColor || '#000000';
                this.strokeWidth = obj.strokeWidth || 2;
                
                // Обновляем элементы управления
                const fontSizeInput = document.getElementById('font-size');
                const fontSizeValue = document.getElementById('font-size-value');
                if (fontSizeInput) {
                    fontSizeInput.value = this.fontSize;
                    fontSizeInput.max = 999;
                }
                if (fontSizeValue) fontSizeValue.textContent = this.fontSize + 'px';
                
                const textContentInput = document.getElementById('text-content');
                if (textContentInput) {
                    textContentInput.value = obj.text || '';
                    this.textValue = obj.text || '';
                }
                
                const fontFamilySelect = document.getElementById('font-family');
                if (fontFamilySelect) fontFamilySelect.value = this.fontFamily;
                
                const strokeColorInput = document.getElementById('stroke-color');
                if (strokeColorInput) strokeColorInput.value = this.strokeColor;
                
                const fillColorInput = document.getElementById('fill-color');
                if (fillColorInput) fillColorInput.value = this.fillColor;
                
                const strokeWidthInput = document.getElementById('stroke-width');
                const strokeWidthValue = document.getElementById('stroke-width-value');
                if (strokeWidthInput) strokeWidthInput.value = this.strokeWidth;
                if (strokeWidthValue) strokeWidthValue.textContent = this.strokeWidth + 'px';
                
                // Обновляем кнопки стилей
                const boldBtn = document.getElementById('text-bold');
                if (boldBtn) boldBtn.classList.toggle('active', this.fontWeight === 'bold');
                
                const italicBtn = document.getElementById('text-italic');
                if (italicBtn) italicBtn.classList.toggle('active', this.fontStyle === 'italic');
                
                const underlineBtn = document.getElementById('text-underline');
                if (underlineBtn) underlineBtn.classList.toggle('active', this.textDecoration === 'underline');
                
                // Обновляем выравнивание
                const alignLeft = document.getElementById('text-align-left');
                const alignCenter = document.getElementById('text-align-center');
                const alignRight = document.getElementById('text-align-right');
                
                if (alignLeft) alignLeft.classList.toggle('active', this.textAlign === 'left');
                if (alignCenter) alignCenter.classList.toggle('active', this.textAlign === 'center');
                if (alignRight) alignRight.classList.toggle('active', this.textAlign === 'right');
                
                // Показываем панель текста
                textProperties.style.display = 'block';
            } else {
                textProperties.style.display = 'none';
            }
        },
    
        setupProperties() {
            const strokeColorInput = document.getElementById('stroke-color');
            if (strokeColorInput) {
                strokeColorInput.addEventListener('change', (e) => {
                    this.strokeColor = e.target.value;
                    const colorValue = document.querySelector('.color-input .color-value');
                    if (colorValue) colorValue.textContent = this.strokeColor;
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            const fillColorInput = document.getElementById('fill-color');
            if (fillColorInput) {
                fillColorInput.addEventListener('change', (e) => {
                    this.fillColor = e.target.value;
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            const strokeWidthInput = document.getElementById('stroke-width');
            if (strokeWidthInput) {
                strokeWidthInput.addEventListener('input', (e) => {
                    this.strokeWidth = parseInt(e.target.value);
                    const strokeValue = document.getElementById('stroke-width-value');
                    if (strokeValue) strokeValue.textContent = this.strokeWidth + 'px';
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            const fontSizeInput = document.getElementById('font-size');
            if (fontSizeInput) {
                fontSizeInput.addEventListener('input', (e) => {
                    this.fontSize = parseInt(e.target.value);
                    const fontSizeValue = document.getElementById('font-size-value');
                    if (fontSizeValue) fontSizeValue.textContent = this.fontSize + 'px';
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            // НОВЫЕ НАСТРОЙКИ ДЛЯ ТЕКСТА
            
            // Семейство шрифтов
            const textContentInput = document.getElementById('text-content');
            if (textContentInput) {
                textContentInput.addEventListener('input', (e) => {
                    this.textValue = e.target.value;
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.selectedObject.text = this.textValue;
                        this.updateTextProperties();
                    }
                });
            }

            const fontFamilySelect = document.getElementById('font-family');
            if (fontFamilySelect) {
                fontFamilySelect.addEventListener('change', (e) => {
                    this.fontFamily = e.target.value;
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            // Жирный
            const boldBtn = document.getElementById('text-bold');
            if (boldBtn) {
                boldBtn.addEventListener('click', () => {
                    this.fontWeight = this.fontWeight === 'bold' ? 'normal' : 'bold';
                    boldBtn.classList.toggle('active', this.fontWeight === 'bold');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            // Курсив
            const italicBtn = document.getElementById('text-italic');
            if (italicBtn) {
                italicBtn.addEventListener('click', () => {
                    this.fontStyle = this.fontStyle === 'italic' ? 'normal' : 'italic';
                    italicBtn.classList.toggle('active', this.fontStyle === 'italic');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }

            // Подчёркивание
            const underlineBtn = document.getElementById('text-underline');
            if (underlineBtn) {
                underlineBtn.addEventListener('click', () => {
                    this.textDecoration = this.textDecoration === 'underline' ? 'none' : 'underline';
                    underlineBtn.classList.toggle('active', this.textDecoration === 'underline');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            // Выравнивание
            const alignLeft = document.getElementById('text-align-left');
            const alignCenter = document.getElementById('text-align-center');
            const alignRight = document.getElementById('text-align-right');
            
            if (alignLeft) {
                alignLeft.addEventListener('click', () => {
                    this.textAlign = 'left';
                    alignLeft.classList.add('active');
                    alignCenter.classList.remove('active');
                    alignRight.classList.remove('active');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            if (alignCenter) {
                alignCenter.addEventListener('click', () => {
                    this.textAlign = 'center';
                    alignLeft.classList.remove('active');
                    alignCenter.classList.add('active');
                    alignRight.classList.remove('active');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
            
            if (alignRight) {
                alignRight.addEventListener('click', () => {
                    this.textAlign = 'right';
                    alignLeft.classList.remove('active');
                    alignCenter.classList.remove('active');
                    alignRight.classList.add('active');
                    if (this.selectedObject && this.selectedObject.type === 'text') {
                        this.updateTextProperties();
                    }
                });
            }
        },

        drawTextAreaPreview(ctx, x, y) {
            if (!this.isDrawingTextArea) return;
            
            const width = x - this.textAreaStartX;
            const height = y - this.textAreaStartY;
            
            if (Math.abs(width) < 5 || Math.abs(height) < 5) return;
            
            ctx.save();
            ctx.strokeStyle = '#0066cc';
            ctx.fillStyle = 'rgba(0, 102, 204, 0.1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            const rectX = width > 0 ? this.textAreaStartX : x;
            const rectY = height > 0 ? this.textAreaStartY : y;
            const rectW = Math.abs(width);
            const rectH = Math.abs(height);
            
            ctx.fillRect(rectX, rectY, rectW, rectH);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
            ctx.restore();
        },

            showTextInputForArea(x, y, width, height) {
            console.log('showTextInputForArea вызван', { x, y, width, height });
            
            const canvas = document.getElementById('drawCanvas');
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const container = document.getElementById('canvasContainer');
            const scale = NavigationManager ? NavigationManager.scale : 1;
            const offsetX = NavigationManager ? NavigationManager.offsetX : 0;
            const offsetY = NavigationManager ? NavigationManager.offsetY : 0;
            
            // Учитываем масштаб и панорамирование
            const screenX = rect.left + (x - offsetX) * scale;
            const screenY = rect.top + (y - offsetY) * scale;
            const screenWidth = width * scale;
            const screenHeight = height * scale;
            
            this.textInput.style.left = screenX + 'px';
            this.textInput.style.top = screenY + 'px';
            this.textInput.style.width = screenWidth + 'px';
            this.textInput.style.height = screenHeight + 'px';
            this.textInput.style.display = 'block';
            this.textInput.style.fontSize = Math.max(12, (height * 0.7)) + 'px';
            this.textInput.value = '';
            this.textInput.focus();
            
            this.textInputX = x;
            this.textInputY = y;
            this.textInputWidth = width;
            this.textInputHeight = height;
            this.editingTextObject = null;
        },
    
    setupTextInput() {
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.className = 'text-input-temp';
        this.textInput.style.position = 'absolute';
        this.textInput.style.display = 'none';
        this.textInput.style.zIndex = '10001';
        this.textInput.style.width = '220px';
        this.textInput.style.padding = '4px 8px';
        this.textInput.style.fontFamily = 'Arial, sans-serif';
        this.textInput.style.border = '2px solid var(--accent)';
        this.textInput.style.borderRadius = '4px';
        this.textInput.style.outline = 'none';
        this.textInput.style.background = 'white';
        this.textInput.style.color = 'black';
        
        document.body.appendChild(this.textInput);
        
        this.textInput.addEventListener('keydown', (e) => {
            console.log('Text input keydown:', e.key);
            if (e.key === 'Enter') {
                console.log('Enter нажат, завершаем ввод текста');
                this.finishTextInput();
            } else if (e.key === 'Escape') {
                console.log('Escape нажат, отмена ввода');
                this.cancelTextInput();
            }
        });
        
        this.textInput.addEventListener('blur', () => {
            console.log('Text input blur, завершаем ввод');
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
    
    startDrawing(x, y, clientX, clientY) {
        if (this.currentTool === 'select') {
            if (this.selectedObject) {
                const handle = this.getHandleAtPoint(x, y, this.selectedObject);
                if (handle) {
                    this.isResizing = true;
                    this.resizingHandle = handle;
                    this.moveStartX = x;
                    this.moveStartY = y;
                    this.objectStartBounds = CanvasManager.getObjectBounds(this.selectedObject);
                    console.log('startDrawing: начало resize, handle=', handle);
                    return false;
                }
            }
            
            const objAtClick = this.findObjectAt(x, y);
            console.log('startDrawing select: объект найден?', !!objAtClick, 'выбранный объект=', !!this.selectedObject, 'совпадает?', objAtClick === this.selectedObject);
            
            if (objAtClick && objAtClick === this.selectedObject) {
                this.isMoving = true;
                this.isResizing = false;
                this.moveStartX = x;
                this.moveStartY = y;
                
                const bounds = CanvasManager.getObjectBounds(objAtClick);
                if (bounds) {
                    this.moveObjectStartX = bounds.x;
                    this.moveObjectStartY = bounds.y;
                } else {
                    this.moveObjectStartX = objAtClick.x || 0;
                    this.moveObjectStartY = objAtClick.y || 0;
                }
                
                this.moveObjectSnapshot = JSON.parse(JSON.stringify(objAtClick));
                
                console.log('startDrawing: начало MOVE, координаты:', { moveStartX: x, moveStartY: y, boundsX: this.moveObjectStartX, boundsY: this.moveObjectStartY });
            } else {
                console.log('startDrawing select: ВЫБИРАЕМ новый объект', !!objAtClick);
                this.selectedObject = objAtClick;

                this.updateTextPropertiesPanel();

                this.isMoving = false;
                this.isResizing = false;
                CanvasManager.redraw();
            }
            return false;
        }
        
        if (this.currentTool === 'text') {
            console.log('Text tool: начало рисования области');
            this.isDrawingTextArea = true;
            this.textAreaStartX = x;
            this.textAreaStartY = y;
            this.isDrawing = true;
            return true;
        }   
        
            if (this.currentTool === 'fill') {
                this.performFill(x, y);
                return false;
        }
        
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;

        if (CanvasManager.previewCtx) {
            CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
        }
        
        if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
            
            // Если ластик, по возможности выбираем слой, на котором находится объект под курсором.
            if (this.currentTool === 'eraser') {
                const hit = this.findLayerAtPoint(x, y);
                if (hit) {
                    CanvasManager.activeLayerIndex = hit.layerIndex;
                }
            }
            
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
        if (!this.isDrawing && !this.isMoving && !this.isResizing && !this.isDrawingTextArea) return;

            if (this.currentTool === 'text' && this.isDrawingTextArea) {
            this.drawTextAreaPreview(ctx, x, y);
            return;
        }
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
            this.updateTextPropertiesPanel();
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

        // Завершение выделения области для текста
        if (this.currentTool === 'text' && this.isDrawingTextArea) {
            this.isDrawingTextArea = false;
            
            const width = x - this.textAreaStartX;
            const height = y - this.textAreaStartY;
            
            if (Math.abs(width) > 10 && Math.abs(height) > 10) {
                // Создаем временный объект текста с областью
                const rectX = width > 0 ? this.textAreaStartX : x;
                const rectY = height > 0 ? this.textAreaStartY : y;
                const rectW = Math.abs(width);
                const rectH = Math.abs(height);
                
                this.textAreaObject = {
                    type: 'text',
                    text: '',
                    x: rectX,
                    y: rectY,
                    width: rectW,
                    height: rectH,
                    fontSize: Math.max(12, rectH * 0.7),
                    fontFamily: 'Arial',
                    strokeColor: this.strokeColor,
                    fillColor: this.fillColor,
                    strokeWidth: this.strokeWidth
                };
                
                // Показываем input для ввода текста
                this.showTextInputForArea(rectX, rectY, rectW, rectH);
            }
            
            this.isDrawing = false;
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
            
            if (obj) {
                console.log('СОЗДАН ОБЪЕКТ ТИПА:', obj.type);
            } else {
                console.log('Объект НЕ создан');
            }
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

            if (this.isPointOnObject(x, y, obj)) {
                return obj;
            }
        }
        return null;
    },

    findLayerAtPoint(x, y) {
        if (!CanvasManager.layers || !Array.isArray(CanvasManager.layers)) return null;

        for (let layerIndex = CanvasManager.layers.length - 1; layerIndex >= 0; layerIndex--) {
            const layer = CanvasManager.layers[layerIndex];
            if (!layer || !layer.visible || layer.locked || !Array.isArray(layer.objects)) continue;

            for (let objIndex = layer.objects.length - 1; objIndex >= 0; objIndex--) {
                const obj = layer.objects[objIndex];
                if (!obj) continue;
                if (this.isPointOnObject(x, y, obj)) {
                    return { layer, layerIndex, object: obj };
                }
            }
        }
        return null;
    },

    isPointOnObject(x, y, obj) {
        if (!obj) return false;

        if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
            return x >= obj.x && x <= obj.x + obj.width && 
                   y >= obj.y && y <= obj.y + obj.height;
        }

        if (obj.type === 'line') {
            const distance = this.distanceToLine(x, y, obj.x1, obj.y1, obj.x2, obj.y2);
            return distance < 10;
        }

        if (obj.type === 'path' || obj.type === 'pencil' || obj.type === 'eraser') {
            if (!obj.points) return false;
            for (let j = 0; j < obj.points.length - 1; j++) {
                const distance = this.distanceToLine(x, y, 
                    obj.points[j].x, obj.points[j].y, 
                    obj.points[j+1].x, obj.points[j+1].y);
                if (distance < 10) return true;
            }
            return false;
        }

        if (obj.type === 'text') {
            return x >= obj.x && x <= obj.x + obj.width && 
                   y >= obj.y && y <= obj.y + obj.height;
        }

        if (obj.type === 'polygon' && obj.points) {
            return this.isPointInPolygon(x, y, obj.points);
        }

        if (obj.type === 'arrow') {
            return x >= obj.x && x <= obj.x + obj.width && 
                   y >= obj.y && y <= obj.y + obj.height;
        }

        return false;
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
        
        if (this.selectedObjects.length > 0) {
            this.selectedObject = this.selectedObjects[0];
            // Обновляем панель свойств при выделении
            this.updateTextPropertiesPanel();
        }

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
            layer.ctx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            layer.objects.forEach(o => CanvasManager.drawSingleObject(layer.ctx, o));
            LayersManager.invalidateLayerThumbnail(i);
            CanvasManager.compositeDirty = true; // ← ВОТ ЭТО ОТСУТСТВУЕТ
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
    
        startTextInput(x, y, clientX, clientY) {
        console.log('startTextInput вызван:', { x, y, clientX, clientY });
        const clickedObj = this.findObjectAt(x, y);
        let screenX;
        let screenY;

        if (typeof clientX === 'number' && typeof clientY === 'number') {
            screenX = clientX;
            screenY = clientY;
            console.log('Использую экранные координаты:', { screenX, screenY });
        } else {
            const canvas = document.getElementById('drawCanvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                screenX = rect.left + x * (rect.width / CanvasManager.width);
                screenY = rect.top + y * (rect.height / CanvasManager.height);
                console.log('Вычисляю экранные координаты:', { screenX, screenY });
            } else {
                screenX = x;
                screenY = y;
                console.log('Canvas не найден');
            }
        }

        if (clickedObj && clickedObj.type === 'text') {
            console.log('Редактируем существующий текст');
            this.editingTextObject = clickedObj;
            this.textInput.style.left = (screenX + 10) + 'px';
            this.textInput.style.top = (screenY + 10) + 'px';
            this.textInput.value = clickedObj.text || '';
            this.textValue = clickedObj.text || '';
            this.textInputX = clickedObj.x;
            this.textInputY = clickedObj.y;
            // Устанавливаем размер шрифта из объекта
            this.fontSize = clickedObj.fontSize || 16;
            const fontSizeInput = document.getElementById('font-size');
            const fontSizeValue = document.getElementById('font-size-value');
            if (fontSizeInput) fontSizeInput.value = this.fontSize;
            if (fontSizeValue) fontSizeValue.textContent = this.fontSize + 'px';
        } else {
            console.log('Создаем новый текст');
            this.editingTextObject = null;
            this.textInput.style.left = (screenX + 10) + 'px';
            this.textInput.style.top = (screenY + 10) + 'px';
            this.textInput.value = '';
            this.textInputX = x;
            this.textInputY = y;
        }
        this.textInput.style.display = 'block';
        this.textInput.style.fontSize = this.fontSize + 'px';
        this.textInput.focus();
    },
    
    finishTextInput() {
        console.log('finishTextInput вызван, текст:', this.textInput.value);
        const text = this.textInput.value.trim();
        if (text && text.length > 0) {
            if (this.editingTextObject && this.editingTextObject.type === 'text') {
                const obj = this.editingTextObject;
                obj.text = text;
                obj.fontSize = this.fontSize;
                obj.fontFamily = this.fontFamily;
                obj.fontWeight = this.fontWeight;
                obj.fontStyle = this.fontStyle;
                obj.textAlign = this.textAlign;
                obj.fillColor = this.fillColor;
                obj.strokeColor = this.strokeColor;
                obj.strokeWidth = this.strokeWidth;

                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.font = `${obj.fontSize}px ${obj.fontFamily}`;
                const metrics = tempCtx.measureText(obj.text);
                obj.width = metrics.width;
                obj.height = obj.fontSize * 1.2;
                    
                this.updateObjectInLayer(obj);
                
                for (let layer of CanvasManager.layers) {
                    if (layer.objects.includes(obj)) {
                        layer.name = text.length > 20 ? text.slice(0, 20) + '...' : text;
                        layer.objectType = obj.type;
                        layer.needsThumbnailUpdate = true;
                        break;
                    }
                }
                
                LayersManager.updateLayersList();
                CanvasManager.redraw();
                HistoryManager?.saveState();
                
                this.selectedObject = obj;
                this.updateTextPropertiesPanel();
            } else if (this.textAreaObject) {
                const obj = this.textAreaObject;
                obj.text = text;
                obj.fontSize = this.fontSize;
                obj.fontFamily = this.fontFamily;
                obj.fontWeight = this.fontWeight;
                obj.fontStyle = this.fontStyle;
                obj.textDecoration = this.textDecoration;
                obj.textAlign = this.textAlign;
                obj.fillColor = this.fillColor;
                obj.strokeColor = this.strokeColor;
                obj.strokeWidth = this.strokeWidth;
                    
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                let fontString = '';
                if (this.fontStyle === 'italic') fontString += 'italic ';
                if (this.fontWeight === 'bold') fontString += 'bold ';
                fontString += `${this.fontSize}px ${this.fontFamily}`;
                tempCtx.font = fontString;
                    
                const metrics = tempCtx.measureText(text);
                obj.width = metrics.width;
                obj.height = this.fontSize * 1.2;
                    
                let textX = this.textInputX;
                let textY = this.textInputY;
                    
                if (this.textAlign === 'center') {
                    textX = this.textInputX + (this.textInputWidth - obj.width) / 2;
                } else if (this.textAlign === 'right') {
                    textX = this.textInputX + this.textInputWidth - obj.width;
                }
                    
                textY = this.textInputY + (this.textInputHeight - obj.height) / 2;
                    
                obj.x = textX;
                obj.y = textY;
                    
                CanvasManager.addObject(obj);
                this.textAreaObject = null;
                    
                this.selectedObject = obj;
                this.updateTextPropertiesPanel();
            }
        }
        this.cancelTextInput();
    },

        updateTextProperties() {
            if (this.selectedObject && this.selectedObject.type === 'text') {
                // Сохраняем старую позицию
                const oldX = this.selectedObject.x;
                const oldY = this.selectedObject.y;
                const oldWidth = this.selectedObject.width;
                
                // Обновляем свойства
                this.selectedObject.text = this.textValue || this.selectedObject.text;
                this.selectedObject.fontSize = this.fontSize;
                this.selectedObject.fontFamily = this.fontFamily;
                this.selectedObject.fontWeight = this.fontWeight;
                this.selectedObject.fontStyle = this.fontStyle;
                this.selectedObject.textDecoration = this.textDecoration;
                this.selectedObject.textAlign = this.textAlign;
                this.selectedObject.fillColor = this.fillColor;
                this.selectedObject.strokeColor = this.strokeColor;
                this.selectedObject.strokeWidth = this.strokeWidth;
                
                // Пересчитываем размеры текста
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                let fontString = '';
                if (this.fontStyle === 'italic') fontString += 'italic ';
                if (this.fontWeight === 'bold') fontString += 'bold ';
                fontString += `${this.fontSize}px ${this.fontFamily}`;
                tempCtx.font = fontString;
                
                const metrics = tempCtx.measureText(this.selectedObject.text);
                const newWidth = metrics.width;
                const newHeight = this.fontSize * 1.2;
                
                // Корректируем позицию в зависимости от выравнивания
                // Чтобы текст не "уезжал" при смене выравнивания
                if (this.textAlign === 'center') {
                    // Центр остаётся на месте
                    this.selectedObject.x = oldX + (oldWidth / 2) - (newWidth / 2);
                } else if (this.textAlign === 'right') {
                    // Правый край остаётся на месте
                    this.selectedObject.x = oldX + oldWidth - newWidth;
                }
                // left - позиция не меняется
                
                this.selectedObject.width = newWidth;
                this.selectedObject.height = newHeight;
                
                this.updateObjectInLayer(this.selectedObject);
                CanvasManager.redraw();
                HistoryManager?.saveState();
                
                console.log('Text updated - position preserved:', {
                    oldX, newX: this.selectedObject.x,
                    oldWidth, newWidth
                });
            }
        },
        cancelTextInput() {
            this.textInput.style.display = 'none';
            this.textInput.value = '';
            this.editingTextObject = null;
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
                obj.x1 = newBounds.minX + (obj.x1 - oldBounds.minX) * scaleX;
                obj.y1 = newBounds.minY + (obj.y1 - oldBounds.minY) * scaleY;
                obj.x2 = newBounds.minX + (obj.x2 - oldBounds.minX) * scaleX;
                obj.y2 = newBounds.minY + (obj.y2 - oldBounds.minY) * scaleY;
            } else if (obj.type === 'polygon') {
                if (obj.points && obj.points.length > 0) {
                    obj.points = obj.points.map(p => ({
                        x: newBounds.minX + (p.x - oldBounds.minX) * scaleX,
                        y: newBounds.minY + (p.y - oldBounds.minY) * scaleY
                    }));
                }
            } else if (obj.type === 'path') {
                if (obj.points && obj.points.length > 0) {
                    obj.points = obj.points.map(p => ({
                        x: newBounds.minX + (p.x - oldBounds.minX) * scaleX,
                        y: newBounds.minY + (p.y - oldBounds.minY) * scaleY
                    }));
                }
            } else if (obj.type === 'text') {
                // ИСПРАВЛЕНО: При resize текста меняем размер шрифта пропорционально
                const avgScale = (scaleX + scaleY) / 2;
                let newFontSize = (obj.fontSize || 16) * avgScale;
                
                // Ограничиваем размер шрифта
                newFontSize = Math.max(8, Math.min(999, newFontSize));
                
                obj.fontSize = newFontSize;
                
                // Обновляем позицию - сохраняем верхний левый угол
                obj.x = newBounds.minX;
                obj.y = newBounds.minY;
                
                // Пересчитываем размеры текста после изменения шрифта
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                let fontString = '';
                if (obj.fontStyle === 'italic') fontString += 'italic ';
                if (obj.fontWeight === 'bold') fontString += 'bold ';
                fontString += `${obj.fontSize}px ${obj.fontFamily || 'Arial Narrow'}`;
                tempCtx.font = fontString;
                
                const metrics = tempCtx.measureText(obj.text);
                obj.width = metrics.width;
                obj.height = obj.fontSize * 1.2;
                
                // Обновляем ползунок размера и панель свойств сразу при ресайзе текста
                if (this.selectedObject === obj) {
                    this.fontSize = obj.fontSize;
                    this.updateTextPropertiesPanel();
                }
                
                console.log('Text resized: new fontSize =', obj.fontSize, 'new bounds =', obj.width, obj.height);
            }
        }
    };