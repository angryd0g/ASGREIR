// Управление созданием фигур
const ShapesManager = {
    // Словарь с функциями создания фигур
    shapes: {
        // Базовые фигуры
        line: (startX, startY, endX, endY, strokeColor, strokeWidth) => ({
            type: 'line',
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth
        }),
        
        rect: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
            type: 'rect',
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
            strokeColor: strokeColor,
            fillColor: fillColor,
            strokeWidth: strokeWidth
        }),
        
        circle: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
            type: 'circle',
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
            strokeColor: strokeColor,
            fillColor: fillColor,
            strokeWidth: strokeWidth
        }),
        
        ellipse: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
            type: 'ellipse',
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY) * 0.7, // Эллипс более вытянутый
            strokeColor: strokeColor,
            fillColor: fillColor,
            strokeWidth: strokeWidth
        }),
        
        // Треугольники
        triangle: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
            type: 'polygon',
            points: [
                {x: startX + (endX - startX) / 2, y: startY},
                {x: endX, y: endY},
                {x: startX, y: endY}
            ],
            strokeColor: strokeColor,
            fillColor: fillColor,
            strokeWidth: strokeWidth
        }),
        
        rightTriangle: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
            type: 'polygon',
            points: [
                {x: startX, y: startY},
                {x: endX, y: startY},
                {x: startX, y: endY}
            ],
            strokeColor: strokeColor,
            fillColor: fillColor,
            strokeWidth: strokeWidth
        }),
        
        // Многоугольники
        rhombus: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
            const centerX = startX + (endX - startX) / 2;
            const centerY = startY + (endY - startY) / 2;
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            return {
                type: 'polygon',
                points: [
                    {x: centerX, y: startY},
                    {x: endX, y: centerY},
                    {x: centerX, y: endY},
                    {x: startX, y: centerY}
                ],
                strokeColor: strokeColor,
                fillColor: fillColor,
                strokeWidth: strokeWidth
            };
        },
        
        pentagon: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
    const centerX = startX + (endX - startX) / 2;
    const centerY = startY + (endY - startY) / 2;
    const radius = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
    const points = [];
    
    for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }
    
    // ВАЖНО: возвращаем объект с правильным типом
    return {
        type: 'polygon',  // Тип должен совпадать с тем, что обрабатывается в CanvasManager
        points: points,
        strokeColor: strokeColor,
        fillColor: fillColor,
        strokeWidth: strokeWidth
    };
},
        
        hexagon: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
            const centerX = startX + (endX - startX) / 2;
            const centerY = startY + (endY - startY) / 2;
            const radius = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
            const points = [];
            
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 - 90) * Math.PI / 180;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                });
            }
            
            return {
                type: 'polygon',
                points: points,
                strokeColor: strokeColor,
                fillColor: fillColor,
                strokeWidth: strokeWidth
            };
        },
        
        // Стрелки
        arrowRight: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
    type: 'arrow',
    direction: 'right',
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    strokeColor: strokeColor,
    fillColor: fillColor,
    strokeWidth: strokeWidth
}),

arrowLeft: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
    type: 'arrow',
    direction: 'left',
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    strokeColor: strokeColor,
    fillColor: fillColor,
    strokeWidth: strokeWidth
}),

arrowUp: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
    type: 'arrow',
    direction: 'up',
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    strokeColor: strokeColor,
    fillColor: fillColor,
    strokeWidth: strokeWidth
}),

arrowDown: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => ({
    type: 'arrow',
    direction: 'down',
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    strokeColor: strokeColor,
    fillColor: fillColor,
    strokeWidth: strokeWidth
}),
        
        // Звезды
        star4: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
            const centerX = startX + (endX - startX) / 2;
            const centerY = startY + (endY - startY) / 2;
            const outerRadius = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
            const innerRadius = outerRadius * 0.4;
            const points = [];
            
            for (let i = 0; i < 8; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * 45 - 45) * Math.PI / 180;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                });
            }
            
            return {
                type: 'polygon',
                points: points,
                strokeColor: strokeColor,
                fillColor: fillColor,
                strokeWidth: strokeWidth
            };
        },
        
        star5: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
            const centerX = startX + (endX - startX) / 2;
            const centerY = startY + (endY - startY) / 2;
            const outerRadius = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
            const innerRadius = outerRadius * 0.4;
            const points = [];
            
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * 36 - 90) * Math.PI / 180;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                });
            }
            
            return {
                type: 'polygon',
                points: points,
                strokeColor: strokeColor,
                fillColor: fillColor,
                strokeWidth: strokeWidth
            };
        },
        
        star6: (startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) => {
            const centerX = startX + (endX - startX) / 2;
            const centerY = startY + (endY - startY) / 2;
            const outerRadius = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
            const innerRadius = outerRadius * 0.5;
            const points = [];
            
            for (let i = 0; i < 12; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * 30 - 90) * Math.PI / 180;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                });
            }
            
            return {
                type: 'polygon',
                points: points,
                strokeColor: strokeColor,
                fillColor: fillColor,
                strokeWidth: strokeWidth
            };
        }
    },
    
    // Метод для создания фигуры
    createShape(tool, startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) {
        if (this.shapes[tool]) {
            return this.shapes[tool](startX, startY, endX, endY, strokeColor, fillColor, strokeWidth);
        }
        return null;
    },
    
    // Метод для рисования временной фигуры (предпросмотр)
    // Метод для рисования временной фигуры (предпросмотр)
drawTemporary(ctx, tool, startX, startY, endX, endY, strokeColor, fillColor, strokeWidth) {
    const obj = this.createShape(tool, startX, startY, endX, endY, strokeColor, fillColor, strokeWidth);
    if (!obj) return;
    
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Рисуем в зависимости от типа объекта
    if (obj.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
    }
    else if (obj.type === 'rect') {
        ctx.beginPath();
        ctx.rect(obj.x, obj.y, obj.width, obj.height);
        if (fillColor !== 'transparent' && fillColor !== '#00000000') {
            ctx.fill();
        }
        ctx.stroke();
    }
    else if (obj.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width/2, obj.y + obj.height/2, 
                   obj.width/2, obj.height/2, 0, 0, Math.PI * 2);
        if (fillColor !== 'transparent' && fillColor !== '#00000000') {
            ctx.fill();
        }
        ctx.stroke();
    }
    else if (obj.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width/2, obj.y + obj.height/2, 
                   obj.width/2, obj.height/2, 0, 0, Math.PI * 2);
        if (fillColor !== 'transparent' && fillColor !== '#00000000') {
            ctx.fill();
        }
        ctx.stroke();
    }
    else if (obj.type === 'polygon') {
        if (obj.points && obj.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            for (let i = 1; i < obj.points.length; i++) {
                ctx.lineTo(obj.points[i].x, obj.points[i].y);
            }
            ctx.closePath();
            if (fillColor !== 'transparent' && fillColor !== '#00000000') {
                ctx.fill();
            }
            ctx.stroke();
        }
    }
    else if (obj.type === 'arrow') {
        // Временная отрисовка стрелки (упрощенная)
        const x = obj.x;
        const y = obj.y;
        const w = obj.width;
        const h = obj.height;
        
        ctx.beginPath();
        
        switch(obj.direction) {
            case 'right':
                ctx.moveTo(x, y);
                ctx.lineTo(x + w - h/2, y);
                ctx.lineTo(x + w - h/2, y - h/4);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w - h/2, y + h + h/4);
                ctx.lineTo(x + w - h/2, y + h);
                ctx.lineTo(x, y + h);
                break;
                
            case 'left':
                ctx.moveTo(x + w, y);
                ctx.lineTo(x + h/2, y);
                ctx.lineTo(x + h/2, y - h/4);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x + h/2, y + h + h/4);
                ctx.lineTo(x + h/2, y + h);
                ctx.lineTo(x + w, y + h);
                break;
                
            case 'up':
                ctx.moveTo(x, y + h);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x - w/4, y + h/2);
                ctx.lineTo(x + w/2, y);
                ctx.lineTo(x + w + w/4, y + h/2);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w, y + h);
                break;
                
            case 'down':
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + h/2);
                ctx.lineTo(x - w/4, y + h/2);
                ctx.lineTo(x + w/2, y + h);
                ctx.lineTo(x + w + w/4, y + h/2);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w, y);
                break;
        }
        
        ctx.closePath();
        if (fillColor !== 'transparent' && fillColor !== '#00000000') {
            ctx.fill();
        }
        ctx.stroke();
    }
    
    ctx.restore();
}
};