// PrintManager.js - Управление печатью

const PrintManager = {
    init() {
        // Инициализация не требуется
    },

    showPreview() {
        this.showPrintPreview();
    },

    // Показать предпросмотр печати
    showPrintPreview() {
        // Удаляем старый модал, если есть
        const oldModal = document.getElementById('printPreviewModal');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.className = 'print-preview-modal';
        modal.id = 'printPreviewModal';
        
        const autoOrientation = CanvasManager.width > CanvasManager.height ? 'landscape' : 'portrait';
        
        modal.innerHTML = `
            <div class="print-preview-container">
                <div class="print-preview-toolbar">
                    <button id="printExecuteBtn" class="print-btn">
                        <i class="fas fa-print"></i> Печать
                    </button>
                    <button id="printCloseBtn" class="close-btn">
                        <i class="fas fa-times"></i> Закрыть
                    </button>
                    <div class="print-settings">
                        <label>
                            <i class="fas fa-arrows-alt"></i> Масштаб:
                            <input type="number" id="printScale" value="100" min="10" max="200" step="10"> %
                        </label>
                        <label>
                            <i class="fas fa-arrow-right"></i> Ориентация:
                            <select id="printOrientation">
                                <option value="auto" selected>Авто (${autoOrientation === 'landscape' ? 'альбомная' : 'книжная'})</option>
                                <option value="portrait">Книжная</option>
                                <option value="landscape">Альбомная</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div class="print-preview-content">
                    <div class="print-preview-page" id="printPreviewPage">
                        <canvas id="printPreviewCanvas"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const previewCanvas = document.getElementById('printPreviewCanvas');
        this.updatePrintPreview(previewCanvas);
        
        const closeBtn = document.getElementById('printCloseBtn');
        const printBtn = document.getElementById('printExecuteBtn');
        const scaleInput = document.getElementById('printScale');
        const orientationSelect = document.getElementById('printOrientation');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.executePrint();
                modal.remove();
            });
        }
        
        const updatePreview = () => {
            this.updatePrintPreview(previewCanvas);
        };
        
        if (scaleInput) scaleInput.addEventListener('input', updatePreview);
        if (orientationSelect) orientationSelect.addEventListener('change', updatePreview);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },
    
    // Обновить предпросмотр
    updatePrintPreview(previewCanvas) {
        if (!previewCanvas) return;
        
        let orientation = document.getElementById('printOrientation')?.value || 'auto';
        let scale = parseInt(document.getElementById('printScale')?.value || 100) / 100;
        
        let width = CanvasManager.width;
        let height = CanvasManager.height;
        
        if (orientation === 'auto') {
            orientation = width > height ? 'landscape' : 'portrait';
        }
        
        // Получаем изображение с холста (все слои)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, width, height);
        
        if (CanvasManager.layers) {
            CanvasManager.layers.forEach(layer => {
                if (layer.visible) {
                    tempCtx.drawImage(layer.canvas, 0, 0);
                }
            });
        }
        
        // Размеры предпросмотра
        let previewWidth = 600;
        let previewHeight = 800;
        
        if (orientation === 'landscape') {
            previewWidth = 800;
            previewHeight = 600;
        }
        
        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        const previewCtx = previewCanvas.getContext('2d');
        
        previewCtx.fillStyle = '#f0f0f0';
        previewCtx.fillRect(0, 0, previewWidth, previewHeight);
        
        // Применяем масштаб (учитываем пользовательский процент)
        const userScaledWidth = width * scale;
        const userScaledHeight = height * scale;

        // Подгоняем пользовательский размер под область предпросмотра
        const fitFactor = Math.min(previewWidth / userScaledWidth, previewHeight / userScaledHeight, 1);

        const displayWidth = userScaledWidth * fitFactor;
        const displayHeight = userScaledHeight * fitFactor;

        const drawX = (previewWidth - displayWidth) / 2;
        const drawY = (previewHeight - displayHeight) / 2;

        // Используем форму drawImage(srcCanvas, sx, sy, sw, sh, dx, dy, dw, dh)
        previewCtx.drawImage(tempCanvas, 0, 0, width, height, drawX, drawY, displayWidth, displayHeight);
        
        // Рамка страницы
        previewCtx.strokeStyle = '#cccccc';
        previewCtx.lineWidth = 1;
        previewCtx.strokeRect(0, 0, previewWidth, previewHeight);
        
        // Показываем текущий масштаб
        previewCtx.font = '12px Arial';
        previewCtx.fillStyle = '#666';
        previewCtx.fillText(`${Math.round(scale * 100)}%`, 10, 20);
    },
    
    // Выполнить печать
    executePrint() {
        let orientation = document.getElementById('printOrientation')?.value || 'auto';
        let scale = parseInt(document.getElementById('printScale')?.value || 100) / 100;
        
        let width = CanvasManager.width;
        let height = CanvasManager.height;
        
        if (orientation === 'auto') {
            orientation = width > height ? 'landscape' : 'portrait';
        }
        
        // Создаем iframe для печати
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        
        let pageCSS = '';
        if (orientation === 'landscape') {
            pageCSS = '@page { size: landscape; margin: 0; }';
        } else {
            pageCSS = '@page { size: portrait; margin: 0; }';
        }
        
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Печать - ASGREIR</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { margin: 0; padding: 0; background: white; }
                    .print-container { display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; }
                    canvas { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
                    @media print {
                        body { margin: 0; padding: 0; }
                        .print-container { margin: 0; padding: 0; width: 100%; height: 100%; }
                        ${pageCSS}
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <canvas id="printCanvas"></canvas>
                </div>
            </body>
            </html>
        `);
        
        iframeDoc.close();
        
        const printCanvas = iframeDoc.getElementById('printCanvas');
        
        // Получаем изображение с холста (все слои)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, width, height);
        
        if (CanvasManager.layers) {
            CanvasManager.layers.forEach(layer => {
                if (layer.visible) {
                    tempCtx.drawImage(layer.canvas, 0, 0);
                }
            });
        }
        
        // Размеры страницы при 300 DPI
        let pageWidthPx, pageHeightPx;
        
        if (orientation === 'landscape') {
            pageWidthPx = 3508;
            pageHeightPx = 2480;
        } else {
            pageWidthPx = 2480;
            pageHeightPx = 3508;
        }
        
        // Применяем масштаб
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        const scaledCtx = scaledCanvas.getContext('2d');
        
        scaledCtx.fillStyle = '#ffffff';
        scaledCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        scaledCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
        
        printCanvas.width = pageWidthPx;
        printCanvas.height = pageHeightPx;
        
        const printCtx = printCanvas.getContext('2d');
        
        printCtx.fillStyle = '#ffffff';
        printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
        
        const imgAspect = scaledWidth / scaledHeight;
        const pageAspect = pageWidthPx / pageHeightPx;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > pageAspect) {
            drawWidth = pageWidthPx;
            drawHeight = drawWidth / imgAspect;
            drawX = 0;
            drawY = (pageHeightPx - drawHeight) / 2;
        } else {
            drawHeight = pageHeightPx;
            drawWidth = drawHeight * imgAspect;
            drawX = (pageWidthPx - drawWidth) / 2;
            drawY = 0;
        }
        
        printCtx.drawImage(scaledCanvas, drawX, drawY, drawWidth, drawHeight);
        
        iframe.contentWindow.print();
        
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 500);
    }
};