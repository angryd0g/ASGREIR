// Управление слоями
const LayersManager = {
    selectedLayerIndex: 0,
    thumbnailUpdateQueue: [], // Очередь для обновления миниатюр

    init() {
        this.setupEventListeners();
        this.updateLayersList();
        this.startThumbnailUpdater(); // Запускаем обновление миниатюр
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
                    this.updateLayersList(); // Обновляем отображение
                    CanvasManager.redraw();
                } else if (e.target.closest('.layer-lock')) {
                    const layer = CanvasManager.layers[idx];
                    layer.locked = !layer.locked;
                    this.updateLayersList();
                } else {
                    // выбор слоя → делаем его активным
                    this.selectedLayerIndex = idx;
                    CanvasManager.activeLayerIndex = idx;
                    this.updateLayersList();
                    CanvasManager.redraw();
                }
            });
        }

        // Настройка перетаскивания
        this.setupDragAndDrop();
    },
    
    updateLayersList() {
        const list = document.getElementById('layersList');
        if (!list) return;

        if (CanvasManager.layers.length === 0) {
            list.innerHTML = '<div class="empty-layers"><i class="fas fa-layers"></i><p>Нет слоёв</p></div>';
            return;
        }

        let html = '';
        CanvasManager.layers.forEach((layer, i) => {
            const isActive = i === this.selectedLayerIndex;
            const eye = layer.visible ? 'fa-eye' : 'fa-eye-slash';
            const lock = layer.locked ? 'fa-lock' : 'fa-unlock';
            const isBackgroundLayer = i === 0;

            // Получаем миниатюру (асинхронно обновляется, но показываем текущую)
            const thumbnailStyle = layer.thumbnailDataUrl 
                ? `background-image: url('${layer.thumbnailDataUrl}');` 
                : 'background-color: #222;';

            // Иконка для типа слоя (если есть объект)
            const layerIcon = layer.objects && layer.objects.length > 0 
                ? this.getLayerIcon(layer.objects[0].type) 
                : 'fa-layer-group';

            html += `
                <div class="layer-item ${isActive ? 'active' : ''}" data-index="${i}" draggable="true">
                    <div class="layer-thumbnail" style="${thumbnailStyle} background-size: cover; background-position: center; width: 40px; height: 40px; border-radius: 4px; border: 1px solid #ccc;"></div>
                    <div class="layer-info">
                        <span class="layer-name">${this.escapeHtml(layer.name)}</span>
                        <span class="layer-type" style="font-size: 10px; opacity: 0.7;">
                            <i class="fas ${layerIcon}"></i> ${this.getLayerTypeName(layer.objectType || 'layer')}
                        </span>
                    </div>
                    <div class="layer-actions">
                        <button class="layer-visibility" ${isBackgroundLayer ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} title="Видимость">
                            <i class="fas ${eye}"></i>
                        </button>
                        <button class="layer-lock" title="Блокировка">
                            <i class="fas ${lock}"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        
        // Асинхронно обновляем миниатюры для слоев, которые изменились
        this.scheduleThumbnailUpdates();
    },
    
    // Генерация миниатюры слоя с высоким качеством
    generateLayerThumbnail(layer, size = 40) {
        return new Promise((resolve) => {
            // Создаём маленький canvas для thumbnail'а
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = size;
            thumbCanvas.height = size;
            const thumbCtx = thumbCanvas.getContext('2d');

            // Белый фон для thumbnail'а (показывает прозрачность)
            thumbCtx.fillStyle = '#ffffff';
            thumbCtx.fillRect(0, 0, size, size);
            
            // Рисуем шахматный фон для прозрачности
            this.drawCheckerboard(thumbCtx, size);
            
            // Проверяем, есть ли содержимое на слое
            const hasContent = layer.objects && layer.objects.length > 0;
            
            if (hasContent) {
                // Вычисляем масштаб для масштабирования содержимого слоя
                const layerWidth = CanvasManager.width;
                const layerHeight = CanvasManager.height;
                
                if (layerWidth > 0 && layerHeight > 0) {
                    const scaleX = size / layerWidth;
                    const scaleY = size / layerHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    // Центрируем и масштабируем изображение на thumbnail'е
                    const offsetX = (size - layerWidth * scale) / 2;
                    const offsetY = (size - layerHeight * scale) / 2;
                    
                    thumbCtx.save();
                    thumbCtx.translate(offsetX, offsetY);
                    thumbCtx.scale(scale, scale);
                    
                    // Рисуем содержимое слоя на thumbnail'е
                    thumbCtx.drawImage(layer.canvas, 0, 0);
                    
                    thumbCtx.restore();
                }
            } else {
                // Пустой слой - показываем иконку
                thumbCtx.fillStyle = '#333';
                thumbCtx.font = `${size * 0.6}px "Font Awesome 6 Free"`;
                thumbCtx.textAlign = 'center';
                thumbCtx.textBaseline = 'middle';
                thumbCtx.fillStyle = '#888';
                thumbCtx.fillText('📄', size/2, size/2);
            }
            
            // Добавляем тонкую рамку
            thumbCtx.strokeStyle = '#ccc';
            thumbCtx.lineWidth = 1;
            thumbCtx.strokeRect(0, 0, size, size);
            
            // Кэшируем thumbnail
            layer.thumbnailDataUrl = thumbCanvas.toDataURL();
            layer.thumbnailSize = size;
            layer.needsThumbnailUpdate = false;
            
            resolve(layer.thumbnailDataUrl);
        });
    },
    
    // Рисуем шахматный фон для показа прозрачности
    drawCheckerboard(ctx, size, cellSize = 5) {
        const colors = ['#f0f0f0', '#d0d0d0'];
        for (let i = 0; i < size; i += cellSize) {
            for (let j = 0; j < size; j += cellSize) {
                const isEven = ((i / cellSize) + (j / cellSize)) % 2 === 0;
                ctx.fillStyle = colors[isEven ? 0 : 1];
                ctx.fillRect(i, j, cellSize, cellSize);
            }
        }
    },
    
    // Планирование обновления миниатюр
    scheduleThumbnailUpdates() {
        CanvasManager.layers.forEach((layer, index) => {
            if (layer.needsThumbnailUpdate) {
                this.thumbnailUpdateQueue.push({layer, index});
            }
        });
        
        // Запускаем обновление, если очередь не пуста
        if (this.thumbnailUpdateQueue.length > 0 && !this.isUpdatingThumbnails) {
            this.processThumbnailQueue();
        }
    },
    
    // Обработка очереди обновления миниатюр
    isUpdatingThumbnails: false,
    
    async processThumbnailQueue() {
        if (this.isUpdatingThumbnails) return;
        this.isUpdatingThumbnails = true;
        
        while (this.thumbnailUpdateQueue.length > 0) {
            const {layer, index} = this.thumbnailUpdateQueue.shift();
            await this.generateLayerThumbnail(layer);
            
            // Обновляем только конкретный элемент в DOM
            this.updateSingleLayerThumbnail(index, layer.thumbnailDataUrl);
        }
        
        this.isUpdatingThumbnails = false;
    },
    
    // Обновление миниатюры конкретного слоя в DOM
    updateSingleLayerThumbnail(index, thumbnailUrl) {
        const list = document.getElementById('layersList');
        if (!list) return;
        
        const layerItem = list.querySelector(`.layer-item[data-index="${index}"]`);
        if (layerItem) {
            const thumbnailDiv = layerItem.querySelector('.layer-thumbnail');
            if (thumbnailDiv) {
                thumbnailDiv.style.backgroundImage = `url('${thumbnailUrl}')`;
                thumbnailDiv.style.backgroundColor = 'transparent';
            }
        }
    },
    
    // Пометить слой для обновления миниатюры
    invalidateLayerThumbnail(layerIndex) {
        if (CanvasManager.layers[layerIndex]) {
            CanvasManager.layers[layerIndex].needsThumbnailUpdate = true;
        }
    },
    
    // Запуск периодического обновления миниатюр (для изменяемых слоёв)
    startThumbnailUpdater() {
        setInterval(() => {
            // Проверяем, нужно ли обновить миниатюры для слоёв с изменениями
            CanvasManager.layers.forEach((layer, index) => {
                if (layer.needsThumbnailUpdate) {
                    this.invalidateLayerThumbnail(index);
                    this.scheduleThumbnailUpdates();
                }
            });
        }, 1000);
    },
    
    // Получение иконки для типа объекта
    getLayerIcon(type) {
        const icons = {
            'rect': 'fa-square',
            'circle': 'fa-circle',
            'ellipse': 'fa-circle',
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
            'imageData': 'Изображение',
            'layer': 'Слой'
        };
        return names[type] || type;
    },
    
    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Настройка перетаскивания
    setupDragAndDrop() {
        const list = document.getElementById('layersList');
        if (!list) return;
        
        let dragged = null;

        list.addEventListener('dragstart', e => {
            dragged = e.target.closest('.layer-item');
            if (!dragged) return;
            dragged.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        list.addEventListener('dragend', e => {
            if (dragged) dragged.classList.remove('dragging');
            list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            dragged = null;
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const over = e.target.closest('.layer-item');
            if (over && over !== dragged) {
                over.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
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

            if (isNaN(from) || isNaN(to) || from === to) return;

            // Меняем порядок в массиве layers
            const [moved] = CanvasManager.layers.splice(from, 1);
            CanvasManager.layers.splice(to, 0, moved);

            // Обновляем индекс активного слоя
            if (CanvasManager.activeLayerIndex === from) {
                CanvasManager.activeLayerIndex = to;
            } else if (CanvasManager.activeLayerIndex === to) {
                CanvasManager.activeLayerIndex = from;
            }
            
            if (this.selectedLayerIndex === from) {
                this.selectedLayerIndex = to;
            } else if (this.selectedLayerIndex === to) {
                this.selectedLayerIndex = from;
            }

            this.updateLayersList();
            CanvasManager.redraw();
            HistoryManager?.saveState();
        });
    }
};