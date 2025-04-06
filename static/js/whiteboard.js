document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('whiteboard-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.querySelector('.canvas-container');
    
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCanvas(); // Redraw all elements after resize
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const whiteboardSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/whiteboard/' + roomName + '/'
    );
    
    const tools = {
        pen: document.getElementById('pen-tool'),
        line: document.getElementById('line-tool'),
        rect: document.getElementById('rect-tool'),
        circle: document.getElementById('circle-tool'),
        text: document.getElementById('text-tool'),
        eraser: document.getElementById('eraser-tool')
    };
    
    let currentTool = 'pen';
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentPath = [];
    let elements = [];
    let undoStack = [];
    let redoStack = [];
    let currentColor = '#000000';
    let currentWidth = 3;
    let currentText = '';
    let activeUsers = new Set();
    let username = '匿名';
    
    for (const [toolName, toolElement] of Object.entries(tools)) {
        toolElement.addEventListener('click', function() {
            for (const tool of Object.values(tools)) {
                tool.classList.remove('active');
            }
            toolElement.classList.add('active');
            currentTool = toolName;
        });
    }
    
    const colorPicker = document.getElementById('color-picker');
    colorPicker.addEventListener('input', function() {
        currentColor = this.value;
    });
    
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', function() {
            currentColor = this.dataset.color;
            colorPicker.value = currentColor;
        });
    });
    
    const strokeWidth = document.getElementById('stroke-width');
    strokeWidth.addEventListener('input', function() {
        currentWidth = parseInt(this.value);
    });
    
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', function() {
        if (confirm('本当にホワイトボードをクリアしますか？')) {
            elements = [];
            undoStack = [];
            redoStack = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            whiteboardSocket.send(JSON.stringify({
                action: 'clear',
                username: username
            }));
            
            showEmoji('💥', canvas.width / 2, canvas.height / 2, 100);
            playSound('clear');
        }
    });
    
    const undoBtn = document.getElementById('undo-btn');
    undoBtn.addEventListener('click', function() {
        if (elements.length > 0) {
            const lastElement = elements.pop();
            undoStack.push(lastElement);
            redrawCanvas();
            
            whiteboardSocket.send(JSON.stringify({
                action: 'delete',
                element_id: lastElement.id,
                username: username
            }));
            
            showEmoji('↩️', canvas.width / 2, canvas.height / 2, 50);
            playSound('undo');
        }
    });
    
    const redoBtn = document.getElementById('redo-btn');
    redoBtn.addEventListener('click', function() {
        if (undoStack.length > 0) {
            const elementToRedo = undoStack.pop();
            elements.push(elementToRedo);
            redrawCanvas();
            
            whiteboardSocket.send(JSON.stringify({
                action: 'draw',
                element_id: elementToRedo.id,
                element_type: elementToRedo.type,
                data: elementToRedo.data,
                username: username
            }));
            
            showEmoji('↪️', canvas.width / 2, canvas.height / 2, 50);
            playSound('redo');
        }
    });
    
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('change', function() {
        username = this.value || '匿名';
    });
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    });
    
    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        
        if (currentTool === 'pen') {
            currentPath = [{
                x: lastX,
                y: lastY
            }];
        } else if (currentTool === 'text') {
            currentText = prompt('テキストを入力してください:');
            if (currentText) {
                const elementId = generateId();
                const element = {
                    id: elementId,
                    type: 'text',
                    data: {
                        x: lastX,
                        y: lastY,
                        text: currentText,
                        color: currentColor,
                        fontSize: currentWidth * 5
                    }
                };
                
                elements.push(element);
                redrawCanvas();
                
                whiteboardSocket.send(JSON.stringify({
                    action: 'draw',
                    element_id: elementId,
                    element_type: 'text',
                    data: element.data,
                    username: username
                }));
                
                showEmoji('💬', lastX, lastY, 30);
                playSound('text');
            }
        }
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (currentTool === 'pen') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            currentPath.push({
                x: x,
                y: y
            });
            
            lastX = x;
            lastY = y;
        } else if (currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = currentWidth * 3;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            if (!currentPath.length) {
                currentPath = [{
                    x: lastX,
                    y: lastY
                }];
            }
            
            currentPath.push({
                x: x,
                y: y
            });
            
            lastX = x;
            lastY = y;
        } else {
            redrawCanvas();
            
            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentWidth;
            
            if (currentTool === 'line') {
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else if (currentTool === 'rect') {
                const width = x - lastX;
                const height = y - lastY;
                ctx.strokeRect(lastX, lastY, width, height);
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
                ctx.arc(lastX, lastY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        
        if (currentTool === 'pen' || currentTool === 'eraser') {
            if (currentPath.length > 1) {
                const elementId = generateId();
                const element = {
                    id: elementId,
                    type: currentTool === 'pen' ? 'path' : 'eraser',
                    data: {
                        points: currentPath,
                        color: currentTool === 'pen' ? currentColor : '#FFFFFF',
                        width: currentTool === 'pen' ? currentWidth : currentWidth * 3
                    }
                };
                
                elements.push(element);
                
                whiteboardSocket.send(JSON.stringify({
                    action: 'draw',
                    element_id: elementId,
                    element_type: element.type,
                    data: element.data,
                    username: username
                }));
                
                if (currentTool === 'pen') {
                    const lastPoint = currentPath[currentPath.length - 1];
                    showEmoji('✏️', lastPoint.x, lastPoint.y, 20);
                    playSound('draw');
                } else {
                    const lastPoint = currentPath[currentPath.length - 1];
                    showEmoji('🧽', lastPoint.x, lastPoint.y, 20);
                    playSound('erase');
                }
            }
            
            currentPath = [];
        } else if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle') {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const elementId = generateId();
            let element;
            
            if (currentTool === 'line') {
                element = {
                    id: elementId,
                    type: 'line',
                    data: {
                        x1: lastX,
                        y1: lastY,
                        x2: x,
                        y2: y,
                        color: currentColor,
                        width: currentWidth
                    }
                };
                
                showEmoji('📏', (lastX + x) / 2, (lastY + y) / 2, 20);
                playSound('line');
            } else if (currentTool === 'rect') {
                const width = x - lastX;
                const height = y - lastY;
                
                element = {
                    id: elementId,
                    type: 'rect',
                    data: {
                        x: lastX,
                        y: lastY,
                        width: width,
                        height: height,
                        color: currentColor,
                        lineWidth: currentWidth
                    }
                };
                
                showEmoji('🔲', lastX + width / 2, lastY + height / 2, 20);
                playSound('rect');
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
                
                element = {
                    id: elementId,
                    type: 'circle',
                    data: {
                        x: lastX,
                        y: lastY,
                        radius: radius,
                        color: currentColor,
                        lineWidth: currentWidth
                    }
                };
                
                showEmoji('⭕', lastX, lastY, 20);
                playSound('circle');
            }
            
            elements.push(element);
            
            whiteboardSocket.send(JSON.stringify({
                action: 'draw',
                element_id: elementId,
                element_type: element.type,
                data: element.data,
                username: username
            }));
        }
        
        redoStack = [];
    }
    
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (const element of elements) {
            drawElement(element);
        }
    }
    
    function drawElement(element) {
        ctx.beginPath();
        
        if (element.type === 'path' || element.type === 'eraser') {
            if (element.data.points.length < 2) return;
            
            ctx.moveTo(element.data.points[0].x, element.data.points[0].y);
            
            for (let i = 1; i < element.data.points.length; i++) {
                ctx.lineTo(element.data.points[i].x, element.data.points[i].y);
            }
            
            ctx.strokeStyle = element.data.color;
            ctx.lineWidth = element.data.width;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else if (element.type === 'line') {
            ctx.moveTo(element.data.x1, element.data.y1);
            ctx.lineTo(element.data.x2, element.data.y2);
            ctx.strokeStyle = element.data.color;
            ctx.lineWidth = element.data.width;
            ctx.stroke();
        } else if (element.type === 'rect') {
            ctx.strokeStyle = element.data.color;
            ctx.lineWidth = element.data.lineWidth;
            ctx.strokeRect(element.data.x, element.data.y, element.data.width, element.data.height);
        } else if (element.type === 'circle') {
            ctx.strokeStyle = element.data.color;
            ctx.lineWidth = element.data.lineWidth;
            ctx.arc(element.data.x, element.data.y, element.data.radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (element.type === 'text') {
            ctx.font = `${element.data.fontSize}px Arial`;
            ctx.fillStyle = element.data.color;
            ctx.fillText(element.data.text, element.data.x, element.data.y);
        }
    }
    
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    whiteboardSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        if (data.action === 'draw') {
            const element = {
                id: data.element_id,
                type: data.element_type,
                data: data.data
            };
            
            const existingIndex = elements.findIndex(el => el.id === element.id);
            if (existingIndex === -1) {
                elements.push(element);
                redrawCanvas();
                
                const message = `${data.username} が描画しました`;
                showNotification(message);
                
                if (element.type === 'path') {
                    const lastPoint = element.data.points[element.data.points.length - 1];
                    showEmoji('✏️', lastPoint.x, lastPoint.y, 20);
                    playSound('draw');
                }
            }
        } else if (data.action === 'clear') {
            elements = [];
            undoStack = [];
            redoStack = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const message = `${data.username} がホワイトボードをクリアしました`;
            showNotification(message);
            
            showEmoji('💥', canvas.width / 2, canvas.height / 2, 100);
            playSound('clear');
        } else if (data.action === 'delete') {
            const index = elements.findIndex(el => el.id === data.element_id);
            if (index !== -1) {
                elements.splice(index, 1);
                redrawCanvas();
                
                const message = `${data.username} が要素を削除しました`;
                showNotification(message);
            }
        }
        
        if (data.username && !activeUsers.has(data.username)) {
            activeUsers.add(data.username);
            updateUserList();
        }
    };
    
    whiteboardSocket.onclose = function(e) {
        console.error('Whiteboard socket closed unexpectedly');
        showNotification('接続が切断されました。ページを再読み込みしてください。', 'error');
    };
    
    function updateUserList() {
        const userCount = document.getElementById('user-count');
        userCount.textContent = activeUsers.size;
        
        const userList = document.getElementById('active-users');
        userList.innerHTML = '';
        
        activeUsers.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
    
    function showEmoji(emoji, x, y, size = 30) {
        const emojiElement = document.createElement('div');
        emojiElement.classList.add('floating-emoji');
        emojiElement.textContent = emoji;
        emojiElement.style.left = `${x}px`;
        emojiElement.style.top = `${y}px`;
        emojiElement.style.fontSize = `${size}px`;
        
        container.appendChild(emojiElement);
        
        const angle = Math.random() * 360;
        const distance = 50 + Math.random() * 100;
        const duration = 1000 + Math.random() * 1000;
        
        emojiElement.style.transition = `all ${duration}ms ease-out`;
        
        setTimeout(() => {
            emojiElement.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 100}px) scale(0.5)`;
            emojiElement.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            emojiElement.remove();
        }, duration + 100);
    }
    
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    emojiButtons.forEach(button => {
        button.addEventListener('click', function() {
            const emoji = this.dataset.emoji;
            
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            
            showEmoji(emoji, x, y, 60);
            playSound('emoji');
        });
    });
    
    function playSound(type) {
        const sounds = {
            draw: '/static/sounds/draw.mp3',
            erase: '/static/sounds/erase.mp3',
            clear: '/static/sounds/clear.mp3',
            undo: '/static/sounds/undo.mp3',
            redo: '/static/sounds/redo.mp3',
            line: '/static/sounds/line.mp3',
            rect: '/static/sounds/rect.mp3',
            circle: '/static/sounds/circle.mp3',
            text: '/static/sounds/text.mp3',
            emoji: '/static/sounds/emoji.mp3'
        };
        
        const audio = new Audio(sounds[type] || sounds.draw);
        audio.volume = 0.3;
        audio.play().catch(e => {
            console.log('Sound playback blocked by browser policy');
        });
    }
    
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    
    chatSend.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (message) {
            addChatMessage(username, message);
            
            chatInput.value = '';
            
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            showEmoji('💬', x, y, 30);
            playSound('text');
        }
    }
    
    function addChatMessage(user, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message-item');
        
        const userSpan = document.createElement('span');
        userSpan.classList.add('chat-username');
        userSpan.textContent = user + ': ';
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        messageElement.appendChild(userSpan);
        messageElement.appendChild(messageSpan);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    const imageBtn = document.getElementById('image-btn');
    
    imageBtn.addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.click();
        
        fileInput.addEventListener('change', function() {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const elementId = generateId();
                        const element = {
                            id: elementId,
                            type: 'image',
                            data: {
                                x: canvas.width / 2 - img.width / 4,
                                y: canvas.height / 2 - img.height / 4,
                                width: img.width / 2,
                                height: img.height / 2,
                                src: e.target.result
                            }
                        };
                        
                        elements.push(element);
                        redrawCanvas();
                        
                        whiteboardSocket.send(JSON.stringify({
                            action: 'draw',
                            element_id: elementId,
                            element_type: 'image',
                            data: element.data,
                            username: username
                        }));
                        
                        showEmoji('🖼️', canvas.width / 2, canvas.height / 2, 40);
                        playSound('image');
                        
                        showNotification('画像をアップロードしました');
                    };
                    img.src = e.target.result;
                };
                
                reader.readAsDataURL(file);
            }
            
            document.body.removeChild(fileInput);
        });
    });
    
    const originalDrawElement = drawElement;
    drawElement = function(element) {
        if (element.type === 'image') {
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, element.data.x, element.data.y, element.data.width, element.data.height);
            };
            img.src = element.data.src;
        } else {
            originalDrawElement(element);
        }
    };
    
    const originalSounds = playSound.toString()
        .match(/const sounds = \{([^}]+)\}/)[1]
        .trim()
        .split(',')
        .map(s => s.trim());
    
    if (!originalSounds.some(s => s.startsWith('image:'))) {
        const soundsObj = playSound.toString().match(/const sounds = \{([^}]+)\}/)[0];
        const newSoundsObj = soundsObj.replace(
            /\{([^}]+)\}/, 
            '{$1,\n            image: \'/static/sounds/image.mp3\''
        );
        
        eval(newSoundsObj);
    }
});
