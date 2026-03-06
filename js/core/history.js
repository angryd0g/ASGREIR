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
        this.undoStack = [this.getCurrentState()];
        this.redoStack = [];
        this.updateButtons();
        console.log('Начальное состояние сохранено');
    },

    reset() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
    },

    trackCanvasChanges() {
        // Перехватываем ключевые действия
        const originalAddObject = CanvasManager.addObject;
        CanvasManager.addObject = (obj) => {
            originalAddObject.call(CanvasManager, obj);
            if (!this.isProcessing) this.saveState();
        };

        const originalAddLayer = CanvasManager.addLayer;
        CanvasManager.addLayer = (name) => {
            const layer = originalAddLayer.call(CanvasManager, name);
            if (!this.isProcessing) this.saveState();
            return layer;
        };

        const originalClear = CanvasManager.clear;
        CanvasManager.clear = () => {
            originalClear.call(CanvasManager);
            if (!this.isProcessing) this.saveState();
        };

        // Если есть removeObject — адаптируем (но лучше удалить старый)
        if (CanvasManager.removeObject) {
            const originalRemove = CanvasManager.removeObject;
            CanvasManager.removeObject = (index) => {
                // Пока не адаптировано под слои — пропускаем или реализуй позже
                console.warn('removeObject пока не поддерживается в истории слоёв');
            };
        }
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
                // Глубокая копия объекта
                const copy = { ...obj };
                if (obj.points) {
                    copy.points = obj.points.map(p => ({ ...p }));
                }
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
        CanvasManager.redraw();
        LayersManager?.updateLayersList();

        this.isProcessing = false;
    },

    saveState() {
        if (this.isProcessing) return;

        const current = this.getCurrentState();
        const last = this.undoStack[this.undoStack.length - 1];

        // Пропускаем, если ничего не изменилось
        if (last && JSON.stringify(last) === JSON.stringify(current)) {
            return;
        }

        this.undoStack.push(current);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }

        this.updateButtons();
        console.log(`Состояние сохранено (undo: ${this.undoStack.length})`);
    },

    undo() {
        if (this.undoStack.length <= 1) return;

        const current = this.undoStack.pop();
        this.redoStack.push(current);

        const previous = this.undoStack[this.undoStack.length - 1];
        this.restoreState(previous);

        this.updateButtons();
    },

    redo() {
        if (this.redoStack.length === 0) return;

        const state = this.redoStack.pop();
        this.undoStack.push(state);
        this.restoreState(state);

        this.updateButtons();
    },

    updateButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        if (undoBtn) {
            const disabled = this.undoStack.length <= 1;
            undoBtn.disabled = disabled;
            undoBtn.style.opacity = disabled ? '0.5' : '1';
        }

        if (redoBtn) {
            const disabled = this.redoStack.length === 0;
            redoBtn.disabled = disabled;
            redoBtn.style.opacity = disabled ? '0.5' : '1';
        }
    },

    clear() {
        this.undoStack = [this.getCurrentState()];
        this.redoStack = [];
        this.updateButtons();
    }
};