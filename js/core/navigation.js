// Управление навигацией и масштабированием
const NavigationManager = {
    scale: 1,          // текущий масштаб (1 = 100%)
    offsetX: 0,        // смещение по X (в координатах canvas без масштаба)
    offsetY: 0,        // смещение по Y
    uiScale: 1,        // масштаб всего интерфейса приложения
    minUIScale: 0.5,   // минимальный масштаб UI
    maxUIScale: 2,     // максимальный масштаб UI
    isPanning: false,
    lastPanX: 0,
    lastPanY: 0,
    minScale: 0.1,
    maxScale: 10,
    container: null,
    canvas: null,
    appElement: null,  // корневой элемент приложения для масштабирования UI
    animationFrame: null,  // для плавной анимации
    momentumX: 0,      // инерция по X
    momentumY: 0,      // инерция по Y
    momentumDecay: 0.95, // коэффициент затухания инерции
    lastUpdateTime: 0, // для throttling при больших масштабах
    lastMouseX: 0,     // последняя позиция мыши
    lastMouseY: 0,     // последняя позиция мыши
    
    init(containerElement, canvasElement) {
        this.container = containerElement;
        this.canvas = canvasElement;
        this.appElement = document.querySelector('.app');
        this.setupNavigation();
        this.setupMouseTracking();
    },
    
    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
    },
    
    setupNavigation() {
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoomTowardsMouse(1.2);
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoomTowardsMouse(1 / 1.2);
        });
        
        document.getElementById('fitView').addEventListener('click', () => {
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.updateZoom();
        });

        // Слушатель Ctrl+Scroll на всем окне (включая пространство за холстом)
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.handleWheel(e);
            } else if (e.altKey && !e.ctrlKey) {
                // Alt+Scroll - масштабирование всего UI
                e.preventDefault();
                this.handleUIZoom(e);
            }
        }, { passive: false });

        // Дополнительный слушатель на document в capture phase для более раннего перехвата браузерного масштабирования
        document.addEventListener('wheel', (e) => {
            if (e.altKey && !e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false, capture: true });
    },

    handleUIZoom(e) {
        // Масштабирование всего интерфейса приложения
        const delta = -Math.sign(e.deltaY) * 0.05;
        const newUIScale = this.uiScale * (1 + delta);
        this.uiScale = Helpers.clamp(newUIScale, this.minUIScale, this.maxUIScale);
        
        // Применяем масштаб к корневому элементу приложения
        if (this.appElement) {
            this.appElement.style.transform = `scale(${this.uiScale})`;
            this.appElement.style.transformOrigin = 'top left';
            this.appElement.style.willChange = 'transform';
        }
    },

    resetUIZoom() {
        this.uiScale = 1;
        if (this.appElement) {
            this.appElement.style.transform = `scale(1)`;
        }
    },
    

    zoomTowardsMouse(factor) {
        // Получаем позицию мыши относительно canvas
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = this.lastMouseX - rect.left;
        let mouseY = this.lastMouseY - rect.top;
        
        // Если курсор вне canvas, зумируем к центру
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }
        
        // Вычисляем позицию курсора в координатах холста
        const contentX = (mouseX - this.offsetX) / this.scale;
        const contentY = (mouseY - this.offsetY) / this.scale;
        
        // Применяем масштаб
        const newScale = Helpers.clamp(this.scale * factor, this.minScale, this.maxScale);
        
        // Корректируем смещение, чтобы зум происходил к курсору
        this.offsetX = mouseX - contentX * newScale;
        this.offsetY = mouseY - contentY * newScale;
        
        this.scale = newScale;
        this.updateZoom();
    },
    
    updateZoom() {
        this.scale = Helpers.clamp(this.scale, 0.1, 9);
        
        // Плавная трансформация с аппаратным ускорением
        this.canvas.style.transform = `translate3d(${this.offsetX}px, ${this.offsetY}px, 0) scale(${this.scale})`;
        this.canvas.style.transformOrigin = 'top left';
        this.canvas.style.willChange = 'transform';
        
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';

        // Синхронизируем overlay сетки
        if (CanvasManager && CanvasManager.syncGridOverlayTransform) {
            CanvasManager.syncGridOverlayTransform();
        }
    },
    
    handleWheel(e) {
        if (!e.ctrlKey) {
            // Плавная прокрутка без масштабирования
            const scrollSpeed = 0.5;
            this.offsetY += e.deltaY * scrollSpeed;
            return;
        }

        e.preventDefault();
        
        // Останавливаем инерцию при зуме
        this.momentumX = 0;
        this.momentumY = 0;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Плавный зум с учетом позиции курсора
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;
        
        // Если курсор вне canvas, зумируем к центру
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }
        
        // Вычисляем позицию курсора в координатах холста
        const contentX = (mouseX - this.offsetX) / this.scale;
        const contentY = (mouseY - this.offsetY) / this.scale;
        
        // Изменяем масштаб
        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = this.scale * (1 + delta);
        this.scale = Helpers.clamp(newScale, this.minScale, this.maxScale);
        
        // Корректируем смещение, чтобы зум происходил относительно курсора
        this.offsetX = mouseX - contentX * this.scale;
        this.offsetY = mouseY - contentY * this.scale;
        
        this.updateZoom();
    },
    
    startPan(x, y) {
        this.isPanning = true;
        this.lastPanX = x;
        this.lastPanY = y;
        // Сбрасываем инерцию при новом пэнинге
        this.momentumX = 0;
        this.momentumY = 0;
        // Отменяем текущую инерцию
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },
    
    updatePan(x, y) {
        if (!this.isPanning) return;
        
        const deltaX = x - this.lastPanX;
        const deltaY = y - this.lastPanY;
        
        // Накопление инерции
        this.momentumX = deltaX;
        this.momentumY = deltaY;
        
        // Плавное обновление позиции
        this.offsetX += deltaX;
        this.offsetY += deltaY;
        this.lastPanX = x;
        this.lastPanY = y;
        
        // Для больших масштабов уменьшаем частоту обновлений для производительности
        const shouldThrottle = this.scale > 5;
        const now = Date.now();
        
        if (shouldThrottle) {
            if (!this.lastUpdateTime || now - this.lastUpdateTime > 16) { // ~60fps -> ~30fps
                this.lastUpdateTime = now;
                this.updateZoom();
            }
        } else {
            // Используем requestAnimationFrame для плавного рендеринга
            if (!this.animationFrame) {
                this.animationFrame = requestAnimationFrame(() => {
                    this.updateZoom();
                    this.animationFrame = null;
                });
            }
        }
    },
    
    stopPan() {
        this.isPanning = false;
        // Отменяем незавершенную анимацию
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        // Запускаем инерцию
        this.applyMomentum();
    },
    
    applyMomentum() {
        if (Math.abs(this.momentumX) < 0.1 && Math.abs(this.momentumY) < 0.1) {
            return; // инерция слишком слабая
        }
        
        // Применяем инерцию
        this.offsetX += this.momentumX;
        this.offsetY += this.momentumY;
        
        // Затухание инерции
        this.momentumX *= this.momentumDecay;
        this.momentumY *= this.momentumDecay;
        
        // Для больших масштабов throttling
        const shouldThrottle = this.scale > 5;
        const now = Date.now();
        
        if (shouldThrottle) {
            if (!this.lastUpdateTime || now - this.lastUpdateTime > 16) {
                this.lastUpdateTime = now;
                this.updateZoom();
            }
        } else {
            this.updateZoom();
        }
        
        // Продолжаем анимацию
        this.animationFrame = requestAnimationFrame(() => this.applyMomentum());
    },
};