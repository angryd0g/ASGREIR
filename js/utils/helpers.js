// Вспомогательные функции
const Helpers = {
    // Получение координат относительно canvas с учетом pixel ratio
    getCanvasCoordinates(e, canvas, scale) {
        const rect = canvas.getBoundingClientRect();
        
        // Координаты мыши относительно видимого canvas
        const cssMouseX = e.clientX - rect.left;
        const cssMouseY = e.clientY - rect.top;
        
        // Преобразуем в логические координаты холста
        const x = cssMouseX / scale;
        const y = cssMouseY / scale;
        
        return { x, y };
    },

    // Ограничение значения в диапазоне
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },

    // Форматирование цвета
    formatColor(color) {
        return color.toUpperCase();
    },
    
    // Проверка на Retina-экран
    isRetina() {
        return window.devicePixelRatio > 1;
    },
    
    // Получение оптимального размера для экспорта
    getExportSize(baseWidth, baseHeight, scale = 2) {
        const pixelRatio = window.devicePixelRatio || 1;
        return {
            width: baseWidth * scale * pixelRatio,
            height: baseHeight * scale * pixelRatio
        };
    },
    
    // Определение нажатой кнопки мыши (кросс-браузерно)
    getMouseButton(e) {
        if ('buttons' in e) {
            return e.buttons; // 1 - левая, 2 - правая, 4 - средняя
        }
        
        // Fallback для старых браузеров
        switch(e.button) {
            case 0: return 1; // левая
            case 1: return 4; // средняя
            case 2: return 2; // правая
            default: return 0;
        }
    },
    
    // Проверка, зажата ли правая кнопка
    isRightButtonPressed(e) {
        const buttons = this.getMouseButton(e);
        return (buttons & 2) === 2; // Проверяем бит правой кнопки
    },
    // Проверка, является ли цвет цветом сетки
    isGridColor(r, g, b) {
    // Цвета сетки: #e0e0e0 (224,224,224), #d0d0d0 (208,208,208), #e8e8e8 (232,232,232)
    const isLightGray = (r >= 200 && r <= 240 && 
                         Math.abs(r - g) < 10 && 
                         Math.abs(g - b) < 10);
    return isLightGray;
    }
};