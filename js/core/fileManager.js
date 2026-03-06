// Менеджер проектных и файловых операций
const FileManager = {
    currentFileName: null,
    selectedPreset: null,
    selectedFormat: null,

    init() {
        this.cacheElements();
        this.setupListeners();
        this.createPresetGrid();
        this.createFormatGrid();
    },

    cacheElements() {
        this.newProjectModal = document.getElementById('newProjectModal');
        this.newWidth = document.getElementById('newWidth');
        this.newHeight = document.getElementById('newHeight');
        this.openFileInput = document.getElementById('openFileInput');
        this.fileModal = document.getElementById('fileModal');
        this.fileModalTitle = document.getElementById('fileModalTitle');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileFormatSelect = document.getElementById('fileFormatSelect');
    },

    createPresetGrid() {
        const presets = [
            { width: 16, height: 16, label: 'Иконка' },
            { width: 32, height: 32, label: 'Иконка' },
            { width: 64, height: 64, label: 'Иконка' },
            { width: 128, height: 128, label: 'Иконка' },
            { width: 1920, height: 1080, label: 'HD' },
            { width: 2560, height: 1440, label: '2K' },
            { width: 3840, height: 2160, label: '4K' },
            { width: 1200, height: 800, label: 'По умолч.' }
        ];

        const container = document.getElementById('presetGrid');
        if (!container) return;

        container.innerHTML = presets.map(preset => `
            <div class="preset-item" data-width="${preset.width}" data-height="${preset.height}">
                <span class="size-value">${preset.width}×${preset.height}</span>
                <span class="size-label">${preset.label}</span>
            </div>
        `).join('');

        container.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                container.querySelectorAll('.preset-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.newWidth.value = item.dataset.width;
                this.newHeight.value = item.dataset.height;
            });
        });
    },

    createFormatGrid() {
        const formats = [
            { ext: 'png', name: 'PNG', desc: 'С прозрачностью', icon: 'fa-image' },
            { ext: 'jpeg', name: 'JPEG', desc: 'Фото качество', icon: 'fa-camera' },
            { ext: 'webp', name: 'WEBP', desc: 'Современный', icon: 'fa-chrome' },
            { ext: 'ico', name: 'ICO', desc: 'Иконки', icon: 'fa-windows' },
            { ext: 'bmp', name: 'BMP', desc: 'Без сжатия', icon: 'fa-file-image' },
            { ext: 'gif', name: 'GIF', desc: 'Анимация', icon: 'fa-film' },
            { ext: 'svg', name: 'SVG', desc: 'Вектор', icon: 'fa-vector-square' },
            { ext: 'pdf', name: 'PDF', desc: 'Документ', icon: 'fa-file-pdf' }
        ];

        const container = document.getElementById('formatGrid');
        if (!container) return;

        container.innerHTML = formats.map(format => `
            <div class="format-item" data-format="${format.ext}">
                <span class="format-icon"><i class="fas ${format.icon}"></i></span>
                <span class="format-name">${format.name}</span>
                <span class="format-desc">${format.desc}</span>
            </div>
        `).join('');

        container.querySelectorAll('.format-item').forEach(item => {
            item.addEventListener('click', () => {
                container.querySelectorAll('.format-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                // Обновляем select для обратной совместимости
                const format = item.dataset.format;
                const option = Array.from(this.fileFormatSelect.options).find(opt => opt.value === format);
                if (option) this.fileFormatSelect.value = format;
            });
        });
    },

    setupListeners() {
        // новый проект
        document.querySelector('[title="Новый проект"]').addEventListener('click', () => {
            this.newProjectModal.classList.remove('hidden');
            this.newWidth.value = CanvasManager.width;
            this.newHeight.value = CanvasManager.height;
        });
        
        document.getElementById('createProjectBtn').addEventListener('click', () => {
            const w = parseInt(this.newWidth.value) || 1200;
            const h = parseInt(this.newHeight.value) || 800;
            CanvasManager.newProject(w, h);
            this.currentFileName = null;
            this.newProjectModal.classList.add('hidden');
        });
        
        document.getElementById('cancelNewProjectBtn').addEventListener('click', () => {
            this.newProjectModal.classList.add('hidden');
        });
        
        this.newProjectModal.addEventListener('click', e => {
            if (e.target === this.newProjectModal) this.newProjectModal.classList.add('hidden');
        });

        // открытие
        this.openFileInput.addEventListener('change', e => {
            if (e.target.files.length) {
                this.loadImageFile(e.target.files[0]);
            }
            e.target.value = '';
        });
        
        window.addEventListener('paste', e => {
            if (!e.clipboardData) return;
            for (let item of e.clipboardData.items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    this.loadImageFile(file);
                    break;
                }
            }
        });
        
        document.querySelector('[title="Открыть"]').addEventListener('click', () => {
            this.openFileInput.click();
        });

        // модалка сохранения/экспорта
        document.getElementById('fileModalOk').addEventListener('click', () => this.performSaveExport());
        document.getElementById('fileModalCancel').addEventListener('click', () => {
            this.fileModal.classList.add('hidden');
        });
        
        this.fileModal.addEventListener('click', e => {
            if (e.target === this.fileModal) this.fileModal.classList.add('hidden');
        });
        
        document.querySelector('[title="Сохранить"]').addEventListener('click', () => this.showFileModal('save'));
        document.querySelector('[title="Экспорт"]').addEventListener('click', () => this.showFileModal('export'));
    },

    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                CanvasManager.newProject(img.width, img.height);
                // Добавляем изображение как объект в слой, чтобы оно не терялось при рисовании
                const imageObj = {
                    type: 'imageData',
                    imageData: evt.target.result
                };
                CanvasManager.activeLayer.objects.push(imageObj);
                CanvasManager.redraw();
                this.currentFileName = file.name;
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    },

    showFileModal(mode) {
        this.fileModalTitle.innerHTML = `<i class="fas ${mode === 'save' ? 'fa-save' : 'fa-download'}"></i> ${mode === 'save' ? 'Сохранить как' : 'Экспорт'}`;
        this.fileNameInput.value = this.currentFileName || 'untitled';
        this.fileModal.dataset.mode = mode;
        this.fileModal.classList.remove('hidden');
    },

    performSaveExport() {
        const mode = this.fileModal.dataset.mode;
        let name = this.fileNameInput.value.trim();
        if (!name) name = 'untitled';
        
        // Получаем формат из выбранного элемента или из select
        const selectedFormat = document.querySelector('.format-item.selected');
        const format = selectedFormat ? selectedFormat.dataset.format : this.fileFormatSelect.value;
        
        const ext = format === 'jpeg' ? 'jpg' : format;
        if (!name.toLowerCase().endsWith('.' + ext)) {
            name += '.' + ext;
        }
        
        const mime = this.getMimeType(format);
        const canvasEl = document.getElementById('drawCanvas');
        
        canvasEl.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.click();
            URL.revokeObjectURL(url);
        }, mime, 0.92);
        
        if (mode === 'save') {
            this.currentFileName = name;
        }
        this.fileModal.classList.add('hidden');
    },

    getMimeType(format) {
        const types = {
            'png': 'image/png',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'gif': 'image/gif',
            'ico': 'image/x-icon',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf'
        };
        return types[format] || 'image/png';
    }
};