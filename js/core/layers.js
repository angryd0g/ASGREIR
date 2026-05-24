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
                    if (idx === 0) {
                        console.warn('Нельзя скрыть слой "Фон" - это основной фон холста');
                        return;
                    }
                    layer.visible = !layer.visible;
                    this.updateLayersList();
                    CanvasManager.compositeDirty = true;
                    CanvasManager.redraw();
                } else if (e.target.closest('.layer-lock')) {
                    const layer = CanvasManager.layers[idx];
                    layer.locked = !layer.locked;
                    this.updateLayersList();
                    this.updateCollapsedLayerPreview();
                } else if (e.target.closest('.layer-delete')) {
                    // === ДОБАВЛЕНО: Обработка удаления слоя ===
                    e.stopPropagation(); // Чтобы клик не выбрал этот слой перед удалением
                    this.deleteLayer(idx);
                } else {
                    // выбор слоя → делаем его активным
                    this.selectedLayerIndex = idx;
                    CanvasManager.activeLayerIndex = idx;
                    this.updateLayersList();
                    this.updateCollapsedLayerPreview();
                    CanvasManager.redraw();
                }
            });
        }

        // Настройка перетаскивания
        this.setupDragAndDrop();
    },
    
    // Метод удаления слоя
    deleteLayer(idx) {
        // Защита: нельзя удалить фоновый слой
        if (idx === 0) {
            console.warn("Нельзя удалить фоновый слой!");
            return;
        }

        // Подтверждение удаления (по желанию, можно убрать, если мешает)
        if (!confirm(`Вы уверены, что хотите удалить слой "${CanvasManager.layers[idx].name}"?`)) {
            return;
        }

        // Удаляем слой из массива CanvasManager
        CanvasManager.layers.splice(idx, 1);

        // Корректируем индексы активного и выбранного слоя
        if (this.selectedLayerIndex >= CanvasManager.layers.length) {
            this.selectedLayerIndex = CanvasManager.layers.length - 1;
        } else if (this.selectedLayerIndex > idx) {
            this.selectedLayerIndex--;
        }

        // Синхронизируем индекс с CanvasManager
        CanvasManager.activeLayerIndex = this.selectedLayerIndex;

        // Полностью обновляем весь интерфейс слоев
        this.updateLayersList();
        this.updateCollapsedLayerPreview();

        // Помечаем холст грязным и принудительно перерисовываем
        CanvasManager.compositeDirty = true;
        CanvasManager.redraw();

        // Сохраняем шаг в историю (Ctrl+Z), если менеджер истории существует
        if (typeof HistoryManager !== 'undefined' && HistoryManager.saveState) {
            HistoryManager.saveState();
        }
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
                        
                        ${!isBackgroundLayer ? `
                        <button class="layer-delete" title="Удалить слой">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        
        // Асинхронно обновляем миниатюры для слоев, которые изменились
        this.scheduleThumbnailUpdates();
        this.updateCollapsedLayerPreview();
    },

    updateCollapsedLayerPreview() {
        const layersPanel = document.querySelector('.layers-panel');
        const previewName = document.getElementById('currentLayerName');
        const preview = document.getElementById('layersCollapsedPreview');
        
        if (!layersPanel || !previewName || !preview) return;

        // Обновляем только если панель свёрнута
        if (!layersPanel.classList.contains('collapsed-panel')) {
            return;
        }

        // Получаем активный слой (текущий выбранный)
        let activeLayer = CanvasManager.activeLayer;
        
        // Если активного слоя нет, берём последний
        if (!activeLayer && CanvasManager.layers.length > 0) {
            activeLayer = CanvasManager.layers[CanvasManager.layers.length - 1];
        }
        
        if (activeLayer) {
            const visibility = activeLayer.visible ? '' : ' (скрыт)';
            const lock = activeLayer.locked ? ' 🔒' : '';
            let name = activeLayer.name;
            if (name.length > 30) {
                name = name.slice(0, 27) + '...';
            }
            previewName.textContent = `${name}${visibility}${lock}`;
            previewName.title = activeLayer.name; // Подсказка с полным именем
        } else {
            previewName.textContent = 'Нет слоёв';
        }
    },
    
    // Генерация миниатюры слоя с высоким качеством
    generateLayerThumbnail(layer, size = 40) {
    return new Promise((resolve) => {
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = size;
        thumbCanvas.height = size;
        const thumbCtx = thumbCanvas.getContext('2d');

        const layerWidth  = CanvasManager.width;
        const layerHeight = CanvasManager.height;
        const scale   = Math.min(size / layerWidth, size / layerHeight);
        const offsetX = (size - layerWidth  * scale) / 2;
        const offsetY = (size - layerHeight * scale) / 2;

        // Шахматка — показывает прозрачность там, где ничего нет
        this.drawCheckerboard(thumbCtx, size);

        // Для фонового слоя (первый, или с именем "Фон") показываем backgroundColor
        const isBackground = CanvasManager.layers.indexOf(layer) === 0
                          || layer.name === 'Фон';
        if (isBackground && CanvasManager.backgroundColor) {
            thumbCtx.fillStyle = CanvasManager.backgroundColor;
            thumbCtx.fillRect(offsetX, offsetY, layerWidth * scale, layerHeight * scale);
        }

        // Рисуем ВСЕГДА — layer.canvas уже содержит и объекты, и заливку, и кисти
        if (layerWidth > 0 && layerHeight > 0) {
            thumbCtx.save();
            thumbCtx.translate(offsetX, offsetY);
            thumbCtx.scale(scale, scale);
            // Рисуем физический canvas слоя (он уже в pixelRatio, поэтому компенсируем)
            thumbCtx.drawImage(
                layer.canvas,
                0, 0, layer.canvas.width, layer.canvas.height,
                0, 0, layerWidth, layerHeight
            );
            thumbCtx.restore();
        }

        thumbCtx.strokeStyle = '#555';
        thumbCtx.lineWidth = 1;
        thumbCtx.strokeRect(0, 0, size, size);

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

        if (index === CanvasManager.activeLayerIndex) {
            this.updateCollapsedLayerPreview();
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
            CanvasManager.compositeDirty = true;
            CanvasManager.redraw();
            HistoryManager?.saveState();
        });
    }
};