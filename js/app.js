document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawCanvas');
    const container = document.getElementById('canvasContainer');

    // Безопасная инициализация менеджеров
    try { if (typeof CanvasManager !== 'undefined') CanvasManager.init(canvas); } catch(e) { console.error("Ошибка в CanvasManager:", e); }
    try { if (typeof ToolsManager !== 'undefined') ToolsManager.init(); } catch(e) { console.error("Ошибка в ToolsManager:", e); }
    try { if (typeof LayersManager !== 'undefined') LayersManager.init(); } catch(e) { console.error("Ошибка в LayersManager:", e); }
    try { if (typeof NavigationManager !== 'undefined') NavigationManager.init(container, canvas); } catch(e) { console.error("Ошибка в NavigationManager:", e); }
    try { if (typeof HistoryManager !== 'undefined') HistoryManager.init(); } catch(e) { console.error("Ошибка в HistoryManager:", e); }
    try { if (typeof FileManager !== 'undefined') FileManager.init(); } catch(e) { console.error("Ошибка в FileManager:", e); }
    try { if (typeof PrintManager !== 'undefined') PrintManager.init(); } catch(e) { console.error("Ошибка в PrintManager:", e); }

    const printBtn = document.getElementById('printBtn');
    if (printBtn && typeof PrintManager !== 'undefined') {
        printBtn.addEventListener('click', () => {
            PrintManager.showPreview();
        });
    }

    // --- УПРАВЛЕНИЕ ПАНЕЛЯМИ (ИНСТРУМЕНТЫ И СЛОИ) ---
    // Ищем панели и по классу, и по ID на случай, если в разметке что-то отличается
    const toolsPanel = document.querySelector('.tools-panel') || document.getElementById('toolsPanel');
    const layersPanel = document.querySelector('.layers-panel') || document.getElementById('layersPanel');
    
    const toolsPanelToggle = document.getElementById('toolsPanelToggle') || document.getElementById('toolsToggleBtn');
    const layersPanelToggle = document.getElementById('layersPanelToggle') || document.getElementById('layersToggleBtn');

    function updateToolsPanelToggle() {
        if (!toolsPanel || !toolsPanelToggle) return;
        const collapsed = toolsPanel.classList.contains('collapsed-panel');
        
        // Вращаем стрелку: если свернута — смотрит вправо (180deg), если раскрыта — влево (0deg)
        const icon = toolsPanelToggle.querySelector('i');
        if (icon) {
            icon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        
        if (window.CanvasManager && CanvasManager.setupHighResCanvas) {
            setTimeout(() => { CanvasManager.setupHighResCanvas(); CanvasManager.redraw(); }, 300);
        }
    }

    function updateLayersPanelToggle() {
        if (!layersPanel || !layersPanelToggle) return;
        const collapsed = layersPanel.classList.contains('collapsed-panel');
        
        // Вращаем стрелку: если свернута — смотрит влево (180deg), если раскрыта — вправо (0deg)
        const icon = layersPanelToggle.querySelector('i');
        if (icon) {
            icon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        
        // --- УПРАВЛЕНИЕ ОТОБРАЖЕНИЕМ ПЕРЕНЕСЕНО В CSS ---
        // Строку с list.style.display мы удалили, чтобы JavaScript не глушил список слоев!
        
        if (collapsed && window.LayersManager && LayersManager.updateCollapsedLayerPreview) {
            LayersManager.updateCollapsedLayerPreview();
        }

        if (window.CanvasManager && CanvasManager.setupHighResCanvas) {
            setTimeout(() => { CanvasManager.setupHighResCanvas(); CanvasManager.redraw(); }, 300);
        }
    }

    // Слушатель клика для левой панели
    if (toolsPanelToggle) {
        toolsPanelToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (!toolsPanel) return;
            toolsPanel.classList.toggle('collapsed-panel');
            updateToolsPanelToggle();
        });
    }

    // Слушатель клика для правой панели
    if (layersPanelToggle) {
        layersPanelToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (!layersPanel) return;
            layersPanel.classList.toggle('collapsed-panel');
            updateLayersPanelToggle();
        });
    }

    // Инициализация состояний стрелок при старте
    updateToolsPanelToggle();
    updateLayersPanelToggle();

    let isPanning = false;
    let isRightButtonPanning = false;

    // Обработчики canvas
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    container.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousemove', updateCoordinates);
    
    // ДОБАВЛЕНО: Обработчик двойного клика для редактирования текста
    canvas.addEventListener('dblclick', onDoubleClick);

    // инициализируем менеджер файлов (fileManager.js)
    FileManager.init();

    // Панорамирование пробелом
    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !NavigationManager.isPanning && !isRightButtonPanning) {
            e.preventDefault();
            NavigationManager.isPanning = true;
            container.classList.add('panning');
            canvas.style.cursor = 'grab';
        }
    });

    window.addEventListener('keyup', e => {
        if (e.code === 'Space') {
            NavigationManager.isPanning = false;
            container.classList.remove('panning');
            if (!isRightButtonPanning) canvas.style.cursor = 'crosshair';
        }
    });

    // Горячие клавиши инструментов и зума
    window.addEventListener('keydown', e => {
        if (e.key === 'v') document.querySelector('[data-tool="select"]').click();
        if (e.key === 'r') document.querySelector('[data-tool="rect"]').click();
        if (e.key === 'c') document.querySelector('[data-tool="circle"]').click();
        if (e.key === 'l') document.querySelector('[data-tool="line"]').click();
        if (e.key === 'p') document.querySelector('[data-tool="pencil"]').click();
        if (e.key === 't') document.querySelector('[data-tool="text"]').click();

        if (e.ctrlKey && e.key === 'ArrowUp') {
            e.preventDefault();
            NavigationManager.scale *= 1.2;
            NavigationManager.updateZoom();
        }
        if (e.ctrlKey && e.key === 'ArrowDown') {
            e.preventDefault();
            NavigationManager.scale /= 1.2;
            NavigationManager.updateZoom();
        }

        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            const exportCanvas = CanvasManager.exportHighRes(3);
            const link = document.createElement('a');
            link.download = 'asgreir-export.png';
            link.href = exportCanvas.toDataURL('image/png');
            link.click();
        }

        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            PrintManager.showPreview();
        }

        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            document.querySelector('[data-tool="select"]').click();
            ToolsManager.selectAllObjects();
        }
    });

    // ДОБАВЛЕНО: Функция двойного клика
    function onDoubleClick(e) {
        const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
        const clickedObj = ToolsManager.findObjectAt(pos.x, pos.y);
        
        if (clickedObj && clickedObj.type === 'text') {
            // Активируем инструмент текст
            const textBtn = document.querySelector('[data-tool="text"]');
            if (textBtn) textBtn.click();
            // Запускаем редактирование текста
            ToolsManager.startTextInput(pos.x, pos.y, e.clientX, e.clientY);
        }
    }

    function onMouseDown(e) {
        if (e.button === 2) {
            e.preventDefault();
            isRightButtonPanning = true;
            container.classList.add('panning');
            canvas.style.cursor = 'grabbing';
            const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
            NavigationManager.startPan(pos.x, pos.y);
            return;
        }

        if (e.button === 0) {
            if (NavigationManager.isPanning) return;
            const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
            
            const started = ToolsManager.startDrawing(pos.x, pos.y, e.clientX, e.clientY);
            
            if (started) {
                CanvasManager.redraw();
            }
            
            if (ToolsManager.isMoving) {
                canvas.style.cursor = 'grabbing';
            }
        }
    }
    
    let pendingRedraw = false;

    function scheduleRedraw() {
        if (!pendingRedraw) {
            pendingRedraw = true;
            requestAnimationFrame(() => {
                CanvasManager.redraw();
                pendingRedraw = false;
            });
        }
    }

    function onMouseMove(e) {
        if (isRightButtonPanning) {
            const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
            NavigationManager.updatePan(pos.x, pos.y);
            return;
        }

        if (NavigationManager.isPanning) {
            const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
            NavigationManager.updatePan(pos.x, pos.y);
            return;
        }

        const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
     
        if (ToolsManager.currentTool === 'text' && ToolsManager.isDrawingTextArea) {
            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            }
            ToolsManager.drawTemporary(CanvasManager.previewCtx, pos.x, pos.y);
            scheduleRedraw();
            return;
        }
            
        if (ToolsManager.currentTool === 'select') {
            updateCursorForSelect(pos.x, pos.y);
            if (!ToolsManager.isMoving && !ToolsManager.isResizing && !ToolsManager.isSelectingArea) return;
        } else {
            if (!ToolsManager.isDrawing && !ToolsManager.isMoving && !ToolsManager.isResizing) return;
        }

        let shouldRedraw = false;

        if (ToolsManager.currentTool === 'select' && ToolsManager.isMoving) {
            ToolsManager.drawTemporary(null, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.currentTool === 'select' && ToolsManager.isResizing) {
            ToolsManager.drawTemporary(null, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.currentTool === 'pencil' || ToolsManager.currentTool === 'eraser') {
            ToolsManager.drawTemporaryIncremental(CanvasManager.previewCtx, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.isDrawing) {
            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
                ToolsManager.drawTemporary(CanvasManager.previewCtx, pos.x, pos.y);
                shouldRedraw = true;
            }
        }

        if (shouldRedraw) scheduleRedraw();
    }

    function updateCursorForSelect(x, y) {
        if (!ToolsManager.selectedObject) {
            canvas.style.cursor = 'crosshair';
            return;
        }

        const handle = ToolsManager.getHandleAtPoint(x, y, ToolsManager.selectedObject);
        
        if (handle) {
            const cursorMap = {
                'rotate': 'crosshair',
                'nw': 'nwse-resize',
                'n': 'ns-resize',
                'ne': 'nesw-resize',
                'e': 'ew-resize',
                'se': 'nwse-resize',
                's': 'ns-resize',
                'sw': 'nesw-resize',
                'w': 'ew-resize'
            };
            canvas.style.cursor = cursorMap[handle] || 'default';
        } else {
            const objAtCursor = ToolsManager.findObjectAt(x, y);
            if (objAtCursor === ToolsManager.selectedObject) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        }
    }

    function onMouseUp(e) {
        if (e.button === 2) {
            isRightButtonPanning = false;
            container.classList.remove('panning');
            canvas.style.cursor = NavigationManager.isPanning ? 'grab' : 'crosshair';
            NavigationManager.stopPan();
            return;
        }

        if (e.button === 0) {
            if (NavigationManager.isPanning || isRightButtonPanning) return;

            const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
            const obj = ToolsManager.stopDrawing(pos.x, pos.y);

            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            }

            if (obj) {
                if (obj.type === 'line' || obj.type === 'path' || obj.type === 'pencil' || 
                    obj.type === 'polygon' || obj.type === 'arrow' ||
                    (obj.width > 2 && obj.height > 2)) {
                    
                    CanvasManager.addObject(obj);
                    CanvasManager.compositeDirty = true;
                    
                    // === ДОБАВЛЕНО ДЛЯ МГНОВЕННОГО ОБНОВЛЕНИЯ МИНИАТЮРЫ ===
                    if (typeof LayersManager !== 'undefined') {
                        // Помечаем текущий активный слой как требующий обновления
                        LayersManager.invalidateLayerThumbnail(CanvasManager.activeLayerIndex);
                        // Заставляем менеджер немедленно перерисовать очередь миниатюр
                        LayersManager.scheduleThumbnailUpdates();
                    }
                }
            }

            if (ToolsManager.currentTool === 'select') {
                if (ToolsManager.selectedObject) {
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'crosshair';
                }
            }

            CanvasManager.redraw();
        }
    }

    function onWheel(e) {
        NavigationManager.handleWheel(e);
    }

    function updateCoordinates(e) {
        const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);
        const coordsElement = document.getElementById('mouse-coords');
        if (coordsElement) {
            coordsElement.textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
        }
    }

    window.addEventListener('resize', () => {
        CanvasManager.setupHighResCanvas();
        CanvasManager.redraw();
        ToolsManager.updateCollapsibleForScreenSize();
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Delete' || e.key === 'Del') {
            const selectedObj = ToolsManager.selectedObject;
            if (selectedObj) {
                let found = false;
                for (let layer of CanvasManager.layers) {
                    const index = layer.objects.indexOf(selectedObj);
                    if (index !== -1) {
                        layer.objects.splice(index, 1);
                        layer.ctx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
                        layer.objects.forEach(obj => CanvasManager.drawSingleObject(layer.ctx, obj));
                        found = true;
                        break;
                    }
                }
                if (found) {
                    ToolsManager.selectedObject = null;
                    CanvasManager.redraw();
                    LayersManager.updateLayersList();
                    HistoryManager?.saveState();
                }
            }
        }
    });

    const toggleGridBtn = document.getElementById('toggleGrid');
    if (toggleGridBtn) {
        toggleGridBtn.addEventListener('click', () => {
            const isVisible = CanvasManager.toggleGrid();
            const icon = toggleGridBtn.querySelector('i');
            if (icon) {
                if (isVisible) {
                    icon.className = 'fas fa-border-all';
                    toggleGridBtn.title = 'Скрыть сетку';
                } else {
                    icon.className = 'fas fa-border-none';
                    toggleGridBtn.title = 'Показать сетку';
                }
            }
        });
        
        const icon = toggleGridBtn.querySelector('i');
        if (icon && CanvasManager.showGrid !== undefined) {
            icon.className = CanvasManager.showGrid ? 'fas fa-border-all' : 'fas fa-border-none';
            toggleGridBtn.title = CanvasManager.showGrid ? 'Скрыть сетку' : 'Показать сетку';
        }
    }

    const toggleRulerBtn = document.getElementById('toggleRuler');
    if (toggleRulerBtn) {
        toggleRulerBtn.addEventListener('click', () => {
            const isVisible = CanvasManager.toggleRuler ? CanvasManager.toggleRuler() : false;
            const icon = toggleRulerBtn.querySelector('i');
            if (icon) {
                if (isVisible) {
                    toggleRulerBtn.title = 'Скрыть линейку';
                } else {
                    toggleRulerBtn.title = 'Показать линейку';
                }
            }
        });
    }
    const bgColorInput = document.getElementById('bgColor'); // Используем правильный ID из HTML
    const bgColorValue = document.getElementById('bgColorValue');

    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            
            if (bgColorValue) {
                bgColorValue.textContent = color.toUpperCase();
            }
            
            if (typeof CanvasManager !== 'undefined') {
                CanvasManager.setBackgroundColor(color);
                
                // Сбрасываем активный класс у пресетов, так как выбран кастомный цвет
                document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
            }
        });
    }

    const bgPresets = document.querySelectorAll('.bg-preset');
    bgPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            bgPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            
            const bgType = preset.dataset.bg; // 'white', 'gray', 'dark', 'grid', 'dots'
            
            if (typeof CanvasManager !== 'undefined') {
                if (bgType === 'white') {
                    CanvasManager.setBackgroundColor('#ffffff');
                    CanvasManager.setGridType('none');
                } else if (bgType === 'gray') {
                    CanvasManager.setBackgroundColor('#f0f0f0');
                    CanvasManager.setGridType('none');
                } else if (bgType === 'dark') {
                    CanvasManager.setBackgroundColor('#1e1e1e');
                    CanvasManager.setGridType('none');
                } else if (bgType === 'grid') {
                    CanvasManager.setBackgroundColor('#ffffff');
                    CanvasManager.setGridType('grid');
                } else if (bgType === 'dots') {
                    CanvasManager.setBackgroundColor('#ffffff');
                    CanvasManager.setGridType('dots');
                }

                // Синхронизируем значение инпута цвета под выбранный пресет
                if (bgColorInput) {
                    bgColorInput.value = CanvasManager.backgroundColor;
                    if (bgColorValue) bgColorValue.textContent = CanvasManager.backgroundColor.toUpperCase();
                }
            }
        });
    });
});

