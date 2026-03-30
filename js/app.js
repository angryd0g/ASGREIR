// Главный файл приложения
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawCanvas');
    const container = document.getElementById('canvasContainer');

    // Инициализация
    CanvasManager.init(canvas);
    ToolsManager.init();
    LayersManager.init();
    NavigationManager.init(container, canvas);
    HistoryManager.init();

    let isPanning = false;
    let isRightButtonPanning = false;

    // Обработчики canvas
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousemove', updateCoordinates);

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

        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            // Сначала активируем инструмент選択 (select)
            document.querySelector('[data-tool="select"]').click();
            // Затем выбираем все объекты
            ToolsManager.selectAllObjects();
        }
    });

    function onMouseDown(e) {
        if (e.button === 2) { // правая кнопка — панорамирование
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
            if (ToolsManager.startDrawing(pos.x, pos.y)) {
                CanvasManager.redraw();
            }
            // Установить grabbing курсор при начале перемещения
            if (ToolsManager.isMoving) {
                canvas.style.cursor = 'grabbing';
            }
        }
    }

    // Флаг для запроса перерисовки в next animation frame
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

        // Обновляем курсор для select инструмента
        if (ToolsManager.currentTool === 'select') {
            updateCursorForSelect(pos.x, pos.y);
            // Для select выходим только если нет активного движения
            if (!ToolsManager.isMoving && !ToolsManager.isResizing) return;
        } else {
            // Для других инструментов нужно активное рисование
            if (!ToolsManager.isDrawing && !ToolsManager.isMoving && !ToolsManager.isResizing) return;
        }

        let shouldRedraw = false;

        // Перемещение выделенного объекта (select инструмент)
        if (ToolsManager.currentTool === 'select' && ToolsManager.isMoving) {
            ToolsManager.drawTemporary(null, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.currentTool === 'select' && ToolsManager.isResizing) {
            // Изменение размера выделенного объекта
            ToolsManager.drawTemporary(null, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.currentTool === 'pencil' || ToolsManager.currentTool === 'eraser') {
            // Для карандаша и ластика не очищаем preview на каждом движении - рисуем инкрементально
            ToolsManager.drawTemporaryIncremental(CanvasManager.previewCtx, pos.x, pos.y);
            shouldRedraw = true;
        } else if (ToolsManager.isDrawing) {
            // Очищаем предыдущий preview для фигур
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

        // Проверяем, над каким handle находится курсор
        const handle = ToolsManager.getHandleAtPoint(x, y, ToolsManager.selectedObject);
        
        if (handle) {
            // Устанавливаем соответствующий cursor для resize
            const cursorMap = {
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
            // Проверяем, находимся ли над выбранным объектом
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

            // Очищаем preview перед добавлением финального объекта
            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
            }

            if (obj) {
                if (obj.type === 'line' || obj.type === 'path' || obj.type === 'pencil' || 
                    obj.type === 'polygon' || obj.type === 'arrow' ||
                    (obj.width > 2 && obj.height > 2)) {
                    CanvasManager.addObject(obj);
                }
            }

            // Восстанавливаем правильный курсор для select инструмента
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
        document.getElementById('mouse-coords').textContent =
            `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
    }

    window.addEventListener('resize', () => {
        CanvasManager.setupHighResCanvas();
        CanvasManager.redraw();
        ToolsManager.updateCollapsibleForScreenSize();
    });

    // Удаление по Delete
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
                }
            }
        }
    });
    // Добавьте после инициализации всех менеджеров, перед закрывающей скобкой DOMContentLoaded

// Переключение сетки
const toggleGridBtn = document.getElementById('toggleGrid');
if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
        const isVisible = CanvasManager.toggleGrid();
        // Меняем иконку кнопки
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
    
    // Устанавливаем начальное состояние иконки
    const icon = toggleGridBtn.querySelector('i');
    if (icon && CanvasManager.showGrid !== undefined) {
        icon.className = CanvasManager.showGrid ? 'fas fa-border-all' : 'fas fa-border-none';
        toggleGridBtn.title = CanvasManager.showGrid ? 'Скрыть сетку' : 'Показать сетку';
    }
}

});