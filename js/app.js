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

        if (!ToolsManager.isDrawing) return;

        const pos = Helpers.getCanvasCoordinates(e, canvas, NavigationManager.scale);

        let shouldRedraw = false;

        // Для карандаша и ластика не очищаем preview на каждом движении - рисуем инкрементально
        if (ToolsManager.currentTool === 'pencil' || ToolsManager.currentTool === 'eraser') {
            ToolsManager.drawTemporaryIncremental(CanvasManager.previewCtx, pos.x, pos.y);
            shouldRedraw = true;
        } else {
            // Очищаем предыдущий preview для фигур
            if (CanvasManager.previewCtx) {
                CanvasManager.previewCtx.clearRect(0, 0, CanvasManager.width, CanvasManager.height);
                ToolsManager.drawTemporary(CanvasManager.previewCtx, pos.x, pos.y);
                shouldRedraw = true;
            }
        }

        if (shouldRedraw) scheduleRedraw();
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
});