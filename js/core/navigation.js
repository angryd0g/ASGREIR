// Управление навигацией и масштабированием
const NavigationManager = {
    scale: 1,          // текущий масштаб (1 = 100%)
    offsetX: 0,        // смещение по X (в координатах canvas без масштаба)
    offsetY: 0,        // смещение по Y
    isPanning: false,
    lastPanX: 0,
    lastPanY: 0,
    minScale: 0.1,
    maxScale: 10,
    container: null,
    canvas: null,
    animationFrame: null,  // для плавной анимации
    momentumX: 0,      // инерция по X
    momentumY: 0,      // инерция по Y
    momentumDecay: 0.95, // коэффициент затухания инерции
    lastUpdateTime: 0, // для throttling при больших масштабах
    
    init(containerElement, canvasElement) {
        this.container = containerElement;
        this.canvas = canvasElement;
        this.setupNavigation();
    },
    
    setupNavigation() {
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.scale *= 1.2;
            this.updateZoom();
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.scale /= 1.2;
            this.updateZoom();
        });
        
        document.getElementById('fitView').addEventListener('click', () => {
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.updateZoom();
        });
    },
    
    updateZoom() {
        this.scale = Helpers.clamp(this.scale, 0.1, 9);
        
        // Плавная трансформация с аппаратным ускорением
        this.canvas.style.transform = `translate3d(${this.offsetX}px, ${this.offsetY}px, 0) scale(${this.scale})`;
        this.canvas.style.transformOrigin = 'top left';
        this.canvas.style.willChange = 'transform';
        
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
    },
    
    handleWheel(e) {
        e.preventDefault();
        
        // Останавливаем инерцию при зуме или прокрутке
        this.momentumX = 0;
        this.momentumY = 0;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (e.ctrlKey) {
            // Плавный зум с учетом позиции курсора
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Вычисляем позицию курсора относительно содержимого холста
            const contentX = mouseX / this.scale;
            const contentY = mouseY / this.scale;
            
            // Изменяем масштаб
            const delta = -Math.sign(e.deltaY) * 0.1;
            const newScale = this.scale * (1 + delta);
            this.scale = Helpers.clamp(newScale, 0.1, 9);
            
            // Корректируем смещение, чтобы зум происходил относительно курсора
            this.offsetX = mouseX - contentX * this.scale;
            this.offsetY = mouseY - contentY * this.scale;
        } else {
            // Плавная прокрутка
            const scrollSpeed = 0.5;
            this.offsetY += e.deltaY * scrollSpeed;
        }
        
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