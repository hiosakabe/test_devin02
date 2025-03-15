document.addEventListener('DOMContentLoaded', function() {
    const chatSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/chat/' + roomName + '/'
    );
    
    const chatScreen = document.getElementById('chat-screen');
    const messageInput = document.getElementById('chat-message-input');
    const messageSubmit = document.getElementById('chat-message-submit');
    const usernameInput = document.getElementById('username');
    const messageColor = document.getElementById('message-color');
    const messageSpeed = document.getElementById('message-speed');
    const messagePosition = document.getElementById('message-position');
    
    // WebSocketからメッセージを受信したときの処理
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        displayMessage(data);
    };
    
    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };
    
    // メッセージ送信処理
    messageInput.focus();
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    messageSubmit.addEventListener('click', function(e) {
        sendMessage();
    });
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            // 位置の計算
            let position;
            switch (messagePosition.value) {
                case 'top':
                    position = Math.floor(Math.random() * 30) + 10; // 上部 10-40%
                    break;
                case 'middle':
                    position = Math.floor(Math.random() * 30) + 40; // 中央 40-70%
                    break;
                case 'bottom':
                    position = Math.floor(Math.random() * 30) + 70; // 下部 70-100%
                    break;
                case 'random':
                default:
                    position = Math.floor(Math.random() * 80) + 10; // ランダム 10-90%
                    break;
            }
            
            chatSocket.send(JSON.stringify({
                'username': usernameInput.value || '匿名',
                'message': message,
                'color': messageColor.value,
                'speed': parseInt(messageSpeed.value),
                'position': position
            }));
            
            messageInput.value = '';
        }
    }
    
    // メッセージを画面に表示する関数
    function displayMessage(data) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.textContent = `${data.username}: ${data.message}`;
        messageElement.style.color = data.color;
        
        // 垂直位置を設定
        messageElement.style.top = `${data.position}%`;
        
        // アニメーション速度を設定（値が大きいほど速い）
        const duration = 15 - data.speed; // 10が最速、2が最遅
        messageElement.style.animationDuration = `${duration}s`;
        
        chatScreen.appendChild(messageElement);
        
        // アニメーション終了後に要素を削除
        messageElement.addEventListener('animationend', function() {
            messageElement.remove();
        });
    }
    
    // 画面サイズが変わったときにメッセージの位置を調整
    window.addEventListener('resize', function() {
        adjustMessagePositions();
    });
    
    function adjustMessagePositions() {
        const messages = document.querySelectorAll('.chat-message');
        messages.forEach(function(message) {
            // 必要に応じて位置調整のロジックを追加
        });
    }
    
    // エモーション機能（絵文字や特殊効果）
    messageInput.addEventListener('input', function() {
        // 特定のキーワードに反応して色や速度を自動設定
        const text = messageInput.value.toLowerCase();
        
        if (text.includes('www') || text.includes('笑')) {
            messageColor.value = '#4CAF50'; // 緑色
        } else if (text.includes('！') || text.includes('!')) {
            messageColor.value = '#F44336'; // 赤色
            messageSpeed.value = '8'; // 速い
        } else if (text.includes('？') || text.includes('?')) {
            messageColor.value = '#2196F3'; // 青色
        }
    });
});
