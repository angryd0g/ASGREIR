// Управление историей действий (Undo/Redo) — адаптировано под слои
const HistoryManager = {
    undoStack: [],
    redoStack: [],
    maxSize: 50,
    isProcessing: false,

    init() {
        this.setupHistoryButtons();
        this.saveInitialState();
        this.trackCanvasChanges();
    },

    setupHistoryButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    },

    saveInitialState() {
        const saved = localStorage.getItem('asgreir-autosave');

        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Восстанавливаем размер холста
                if (data.width && data.height) {
                    CanvasManager.width = data.width;
                    CanvasManager.height = data.height;
                    CanvasManager.canvas.width = data.width * CanvasManager.pixelRatio;
                    CanvasManager.canvas.height = data.height * CanvasManager.pixelRatio;
                    CanvasManager.canvas.style.width = `${data.width}px`;
                    CanvasManager.canvas.style.height = `${data.height}px`;
                    CanvasManager.ctx = CanvasManager.canvas.getContext('2d');
                    CanvasManager.ctx.scale(CanvasManager.pixelRatio, CanvasManager.pixelRatio);
                    CanvasManager.createGridCanvas();
                    CanvasManager.createCompositeCanvas();
                }
                if (data.backgroundColor) {
                    CanvasManager.setBackgroundColor(data.backgroundColor);
                }
                // Восстанавливаем слои
                this.undoStack = [data.layers];
                this.restoreState(data.layers);

                if (data.projectName) {
                    setTimeout(() => FileManager.setProjectName(data.projectName), 0);
                }

                console.log('Автосохранение восстановлено');
            } catch(e) {
                console.warn('Не удалось восстановить автосохранение:', e);
                this.undoStack = [this.getCurrentState()];
            }
        } else {
            this.undoStack = [this.getCurrentState()];
        }

        this.redoStack = [];
        this.updateButtons();
    },

    reset() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
    },

    trackCanvasChanges() {
        // addObject, addLayer, clear в canvas.js уже вызывают HistoryManager.saveState() напрямую.
        // Дополнительные обёртки не нужны и вызывают дублирование состояний.
    },

    getCurrentState() {
        // Сохраняем структуру всех слоёв
        return CanvasManager.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            objects: layer.objects.map(obj => {
                // Глубокая копия объекта - копируем все свойства
                const copy = { ...obj };
                
                // Копируем массивы точек (для полигонов, путей и т.д.)
                if (obj.points) {
                    copy.points = obj.points.map(p => ({ ...p }));
                }
                
                // Копируем вырезы (cutouts), если есть
                if (obj.cutouts && Array.isArray(obj.cutouts)) {
                    copy.cutouts = obj.cutouts.map(cutout => ({
                        ...cutout,
                        points: cutout.points ? cutout.points.map(p => ({ ...p })) : null,
                        bounds: cutout.bounds ? { ...cutout.bounds } : null
                    }));
                }
                
                // НЕ копируем canvas или контексты - они не нужны в истории
                delete copy.canvas;
                delete copy.ctx;
                delete copy.cachedImage; // Удаляем кэшированное изображение, будет восстановлено через imageData
                
                return copy;
            })
        }));
    },

    restoreState(state) {
        this.isProcessing = true;

        CanvasManager.layers = state.map(layerData => {
            const offscreen = document.createElement('canvas');
            offscreen.width = CanvasManager.canvas.width;
            offscreen.height = CanvasManager.canvas.height;
            const ctx = offscreen.getContext('2d');
            ctx.scale(CanvasManager.pixelRatio, CanvasManager.pixelRatio);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const layer = {
                id: layerData.id,
                name: layerData.name,
                visible: layerData.visible,
                locked: layerData.locked,
                opacity: layerData.opacity || 1,
                canvas: offscreen,
                ctx: ctx,
                objects: layerData.objects.map(obj => {
                    // Глубокая копия объекта с сохранением вложенных массивов
                    const copy = { ...obj };
                    if (obj.points) {
                        copy.points = obj.points.map(p => ({ ...p }));
                    }
                    if (obj.cutouts && Array.isArray(obj.cutouts)) {
                        copy.cutouts = obj.cutouts.map(cutout => ({
                            ...cutout,
                            points: cutout.points ? cutout.points.map(p => ({ ...p })) : null,
                            bounds: cutout.bounds ? { ...cutout.bounds } : null
                        }));
                    }
                    return copy;
                })
            };

            // Перерисовываем все объекты слоя
            layer.objects.forEach(obj => {
                CanvasManager.drawSingleObject(layer.ctx, obj);
            });

            return layer;
        });

        // Если слоёв нет — создаём хотя бы один
        if (CanvasManager.layers.length === 0) {
            CanvasManager.addLayer("Фон");
        }

        CanvasManager.activeLayerIndex = Math.min(CanvasManager.activeLayerIndex, CanvasManager.layers.length - 1);
        
        // Очищаем выделение при восстановлении состояния
        if (ToolsManager) {
            ToolsManager.selectedObject = null;
            ToolsManager.selectedObjects = [];
        }
        
        CanvasManager.compositeDirty = true;
        CanvasManager.redraw();
        LayersManager?.updateLayersList();

        this.isProcessing = false;
    },

    saveState() {
        if (this.isProcessing) return;

        const current = this.getCurrentState();
        const last = this.undoStack[this.undoStack.length - 1];

        if (last && JSON.stringify(last) === JSON.stringify(current)) return;

        this.undoStack.push(current);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSize) this.undoStack.shift();

        this.updateButtons();

        // Автосохранение
        try {
            localStorage.setItem('asgreir-autosave', JSON.stringify({
                layers: current,
                backgroundColor: CanvasManager.backgroundColor,
                width: CanvasManager.width,
                height: CanvasManager.height,
                projectName: FileManager.currentProjectName || null
            }));
        } catch(e) {
            console.warn('Автосохранение не удалось (возможно мало места):', e);
        }
    },

    undo() {
        if (this.undoStack.length <= 1) {
            console.log('Нечего отменять');
            return;
        }

        const current = this.undoStack.pop();
        this.redoStack.push(current);

        const previous = this.undoStack[this.undoStack.length - 1];
        console.log('Undo: восстанавливаем состояние, стек undo:', this.undoStack.length);
        
        this.restoreState(previous);
        this.updateButtons();
    },

    redo() {
        if (this.redoStack.length === 0) {
            console.log('Нечего повторять');
            return;
        }

        const state = this.redoStack.pop();
        this.undoStack.push(state);
        console.log('Redo: восстанавливаем состояние, стек undo:', this.undoStack.length);
        
        this.restoreState(state);
        this.updateButtons();
    },

    updateButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        if (undoBtn) {
            const disabled = this.undoStack.length <= 1;
            undoBtn.disabled = disabled;
            undoBtn.classList.toggle('disabled', disabled);
            undoBtn.style.opacity = disabled ? '0.5' : '1';
            undoBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }

        if (redoBtn) {
            const disabled = this.redoStack.length === 0;
            redoBtn.disabled = disabled;
            redoBtn.classList.toggle('disabled', disabled);
            redoBtn.style.opacity = disabled ? '0.5' : '1';
            redoBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }
    },

    clear() {
        this.undoStack = [this.getCurrentState()];
        this.redoStack = [];
        this.updateButtons();
    }
};