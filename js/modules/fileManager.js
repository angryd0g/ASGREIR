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

    currentProjectName: null,

    cacheElements() {
        this.newProjectModal = document.getElementById('newProjectModal');
        this.newWidth = document.getElementById('newWidth');
        this.newHeight = document.getElementById('newHeight');
        this.projectNameInput = document.getElementById('projectName');
        this.openFileInput = document.getElementById('openFileInput');
        this.fileModal = document.getElementById('fileModal');
        this.fileModalTitle = document.getElementById('fileModalTitle');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileFormatSelect = document.getElementById('fileFormatSelect');
        this.projectTitle = document.getElementById('projectTitle');
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
                const format = item.dataset.format;
                const option = Array.from(this.fileFormatSelect.options).find(opt => opt.value === format);
                if (option) this.fileFormatSelect.value = format;
            });
        });
    },

    setupListeners() {
        document.querySelector('[title="Новый проект"]').addEventListener('click', () => {
            this.newProjectModal.classList.remove('hidden');
            this.newWidth.value = CanvasManager.width;
            this.newHeight.value = CanvasManager.height;
            this.projectNameInput.value = this.currentProjectName || '';
        });
        
        document.getElementById('createProjectBtn').addEventListener('click', () => {
            const w = parseInt(this.newWidth.value) || 1200;
            const h = parseInt(this.newHeight.value) || 800;
            const projectName = this.projectNameInput.value.trim();
            this.setProjectName(projectName);
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

        document.getElementById('fileModalOk').addEventListener('click', () => this.performSaveExport());
        document.getElementById('fileModalCancel').addEventListener('click', () => {
            this.fileModal.classList.add('hidden');
        });
        
        this.fileModal.addEventListener('click', e => {
            if (e.target === this.fileModal) this.fileModal.classList.add('hidden');
        });
        
        document.querySelector('[title="Сохранить/Сохранить как"]').addEventListener('click', () => this.showFileModal('save'));
        document.querySelector('[title="Экспорт проекта"]').addEventListener('click', () => this.showFileModal('export'));
    },

    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const cw = CanvasManager.width;
                const ch = CanvasManager.height;

                // Вписываем в холст с сохранением пропорций, не увеличивая оригинал
                const scale = Math.min(cw / img.width, ch / img.height, 1);
                const drawW = Math.round(img.width * scale);
                const drawH = Math.round(img.height * scale);
                const drawX = Math.round((cw - drawW) / 2);
                const drawY = Math.round((ch - drawH) / 2);

                const imageObj = {
                    type: 'imageData',
                    imageData: evt.target.result,
                    cachedImage: img,
                    x: drawX,
                    y: drawY,
                    width: drawW,
                    height: drawH
                };

                // addObject создаёт новый слой, рисует и сохраняет историю
                CanvasManager.addObject(imageObj);

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

        const selectedFormat = document.querySelector('.format-item.selected');
        const format = selectedFormat ? selectedFormat.dataset.format : this.fileFormatSelect.value;

        const ext = format === 'jpeg' ? 'jpg' : format;
        if (!name.toLowerCase().endsWith('.' + ext)) {
            name += '.' + ext;
        }

        const mime = this.getMimeType(format);

        // Берём чистый canvas через exportHighRes (без шашки, с прозрачностью если надо)
        const exportCanvas = CanvasManager.exportHighRes(1);

        exportCanvas.toBlob(blob => {
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

    setProjectName(name) {
        this.currentProjectName = name || null;
        if (this.projectTitle) {
            this.projectTitle.textContent = name ? ` — ${name}` : '';
        }
        document.title = name ? `ASGREIR — ${name}` : 'ASGREIR';
    },

    getMimeType(format) {
        const types = {
            'png': 'image/png',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'pdf': 'application/pdf'
        };
        return types[format] || 'image/png';
    }
};