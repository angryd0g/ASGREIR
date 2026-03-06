// Управление слоями
const LayersManager = {
    selectedLayerIndex: 0,

    init() {
        this.setupEventListeners();
        this.updateLayersList();  // начальное отображение
    },
    
    setupEventListeners() {
        // Кнопка "+"
        document.querySelector('.add-layer-btn')?.addEventListener('click', () => {
            CanvasManager.addLayer();
            this.selectedLayerIndex = CanvasManager.activeLayerIndex;
            this.updateLayersList();
        });

        const list = document.getElementById('layersList');
        if (list) {
            list.addEventListener('click', e => {
                const item = e.target.closest('.layer-item');
                if (!item) return;

                const idx = parseInt(item.dataset.index);
                if (isNaN(idx)) return;

                if (e.target.closest('.layer-visibility')) {
                    const layer = CanvasManager.layers[idx];
                    // Запрещаем скрыть "Фон" (первый слой)
                    if (idx === 0) {
                        console.warn('Нельзя скрыть слой "Фон" - это основной фон холста');
                        return;
                    }
                    layer.visible = !layer.visible;
                } else if (e.target.closest('.layer-lock')) {
                    const layer = CanvasManager.layers[idx];
                    layer.locked = !layer.locked;
                } else {
                    // выбор слоя → делаем его активным
                    this.selectedLayerIndex = idx;
                    CanvasManager.activeLayerIndex = idx;
                }

                this.updateLayersList();
                CanvasManager.redraw();
            });
        }
    },
    
    updateLayersList() {
        const list = document.getElementById('layersList');
        if (!list) return;

        // ВНИМАНИЕ: Никогда не скрываем сам холст
        const canvas = document.getElementById('drawCanvas');
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvas) canvas.style.display = 'block';
        if (canvasContainer) canvasContainer.style.display = 'flex';

        if (CanvasManager.layers.length === 0) {
            list.innerHTML = '<div class="empty-layers"><p>Нет слоёв</p></div>';
            return;
        }

        let html = '';
        CanvasManager.layers.forEach((layer, i) => {
            const isActive = i === this.selectedLayerIndex;
            const eye = layer.visible ? 'fa-eye' : 'fa-eye-slash';
            const lock = layer.locked ? 'fa-lock' : 'fa-unlock';
            const isBackgroundLayer = i === 0; // Проверяем, это ли фоновый слой

            html += `
                <div class="layer-item ${isActive ? 'active' : ''}" data-index="${i}" draggable="true">
                    <div class="layer-icon"><i class="fas fa-layer-group"></i></div>
                    <div class="layer-info">
                        <span class="layer-name">${layer.name}</span>
                    </div>
                    <div class="layer-actions">
                        <button class="layer-visibility" ${isBackgroundLayer ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            <i class="fas ${eye}"></i>
                        </button>
                        <button class="layer-lock"><i class="fas ${lock}"></i></button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    },
    
    // Получение иконки для типа объекта
    getLayerIcon(type) {
        const icons = {
            'rect': 'fa-square',
            'circle': 'fa-circle',
            'ellipse': 'fa-oval',
            'line': 'fa-slash',
            'path': 'fa-pencil-alt',
            'pencil': 'fa-pencil-alt',
            'eraser': 'fa-eraser',
            'polygon': 'fa-draw-polygon',
            'triangle': 'fa-play',
            'rightTriangle': 'fa-play',
            'rhombus': 'fa-square',
            'pentagon': 'fa-draw-polygon',
            'hexagon': 'fa-draw-polygon',
            'arrow': 'fa-arrow-right',
            'arrowRight': 'fa-arrow-right',
            'arrowLeft': 'fa-arrow-left',
            'arrowUp': 'fa-arrow-up',
            'arrowDown': 'fa-arrow-down',
            'star4': 'fa-star',
            'star5': 'fa-star',
            'star6': 'fa-star',
            'text': 'fa-font',
            'fill': 'fa-fill-drip',
            'imageData': 'fa-image'
        };
        return icons[type] || 'fa-shape';
    },
    
    // Получение названия для типа объекта
    getLayerTypeName(type) {
        const names = {
            'rect': 'Прямоугольник',
            'circle': 'Круг',
            'ellipse': 'Эллипс',
            'line': 'Линия',
            'path': 'Карандаш',
            'pencil': 'Карандаш',
            'eraser': 'Ластик',
            'polygon': 'Многоугольник',
            'triangle': 'Треугольник',
            'rightTriangle': 'Прямоуг. треугольник',
            'rhombus': 'Ромб',
            'pentagon': 'Пятиугольник',
            'hexagon': 'Шестиугольник',
            'arrow': 'Стрелка',
            'arrowRight': 'Стрелка вправо',
            'arrowLeft': 'Стрелка влево',
            'arrowUp': 'Стрелка вверх',
            'arrowDown': 'Стрелка вниз',
            'star4': '4-кон. звезда',
            'star5': '5-кон. звезда',
            'star6': '6-кон. звезда',
            'text': 'Текст',
            'fill': 'Заливка',
            'imageData': 'Изображение'
        };
        return names[type] || type;
    },
    
    // Отрисовка списка слоев
    renderLayers() {
        const layersList = document.getElementById('layersList');
        
        if (this.layers.length === 0) {
            layersList.innerHTML = `
                <div class="empty-layers">
                    <i class="fas fa-layers"></i>
                    <p>Нет объектов на холсте</p>
                </div>
            `;
            return;
        }
        
        layersList.innerHTML = this.layers.map((layer, index) => {
            const icon = this.getLayerIcon(layer.type);
            const typeName = this.getLayerTypeName(layer.type);
            const isSelected = index === this.selectedLayerIndex;
            
            return `
                <div class="layer-item ${isSelected ? 'active' : ''}" 
                     data-index="${index}"
                     draggable="true">
                    <div class="layer-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="layer-info">
                        <span class="layer-name">Слой ${index + 1}</span>
                        <span class="layer-type">${typeName}</span>
                    </div>
                    <div class="layer-actions">
                        <button class="layer-visibility ${layer.visible ? 'visible' : ''}" 
                                title="${layer.visible ? 'Скрыть' : 'Показать'}">
                            <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button class="layer-lock" 
                                title="${layer.locked ? 'Разблокировать' : 'Заблокировать'}">
                            <i class="fas ${layer.locked ? 'fa-lock' : 'fa-unlock'}"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Обновляем стили для скрытых слоев
        this.updateVisibility();
    },
    
    // Выделение слоя
    selectLayer(index) {
        index = parseInt(index);
        if (index >= 0 && index < this.layers.length) {
            this.selectedLayerIndex = index;
            this.renderLayers();
            
            // Выделяем соответствующий объект на холсте
            ToolsManager.selectedObject = CanvasManager.objects[index];
            CanvasManager.redraw();
        }
    },
    
    // Переключение видимости
    toggleVisibility(index) {
        index = parseInt(index);
        if (index >= 0 && index < this.layers.length) {
            this.layers[index].visible = !this.layers[index].visible;
            this.updateVisibility();
            this.renderLayers();
        }
    },
    
    // Обновление видимости на холсте
    updateVisibility() {
        // Пока просто перерисовываем, позже можно добавить фильтрацию
        CanvasManager.redraw();
    },
    
    // Переключение блокировки
    toggleLock(index) {
        index = parseInt(index);
        if (index >= 0 && index < this.layers.length) {
            this.layers[index].locked = !this.layers[index].locked;
            this.renderLayers();
        }
    },
    
    // Добавление нового пустого слоя
    addLayer() {
        // Создаем пустой слой (можно добавить позже)
        console.log('Добавление нового слоя');
    },
    
    // Настройка перетаскивания
    setupDragAndDrop() {
        const list = document.getElementById('layersList');
        let dragged = null;

        list.addEventListener('dragstart', e => {
            dragged = e.target.closest('.layer-item');
            if (!dragged) return;
            dragged.classList.add('dragging');
        });

        list.addEventListener('dragend', e => {
            if (dragged) dragged.classList.remove('dragging');
            list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const over = e.target.closest('.layer-item');
            if (over && over !== dragged) {
                over.classList.add('drag-over');
            }
        });

        list.addEventListener('dragleave', e => {
            const over = e.target.closest('.layer-item');
            if (over) over.classList.remove('drag-over');
        });

        list.addEventListener('drop', e => {
            e.preventDefault();
            const target = e.target.closest('.layer-item');
            if (!target || !dragged || target === dragged) return;

            const from = parseInt(dragged.dataset.index);
            const to = parseInt(target.dataset.index);

            if (from === to) return;

            // Меняем порядок в массиве layers
            const [moved] = CanvasManager.layers.splice(from, 1);
            CanvasManager.layers.splice(to, 0, moved);

            // Обновляем индекс активного слоя, если он был перемещён
            if (CanvasManager.activeLayerIndex === from) {
                CanvasManager.activeLayerIndex = to;
            } else if (CanvasManager.activeLayerIndex === to) {
                CanvasManager.activeLayerIndex = from;
            }

            this.updateLayersList();
            CanvasManager.redraw();
            HistoryManager?.saveState();
        });
    }
};