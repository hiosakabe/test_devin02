// YouTube API関連の処理
let player;
function getYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// YouTube APIのコールバック関数（グローバルスコープに配置）
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready, background type:', typeof backgroundType, backgroundType);
    console.log('Background URL:', typeof backgroundUrl, backgroundUrl);
    
    if (typeof backgroundType !== 'undefined' && backgroundType === 'youtube' && backgroundUrl) {
        const videoId = getYouTubeVideoId(backgroundUrl);
        console.log('Video ID:', videoId);
        
        if (videoId) {
            player = new YT.Player('youtube-player', {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    loop: 1,
                    playlist: videoId,
                    rel: 0,
                    showinfo: 0,
                    mute: 1
                },
                events: {
                    'onReady': function(event) {
                        event.target.playVideo();
                        console.log('YouTube player ready and playing');
                    }
                }
            });
        }
    }
}

// CSRFトークン取得用関数
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener('DOMContentLoaded', function() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const chatSocket = new WebSocket(
        protocol + window.location.host + '/ws/chat/' + roomName + '/'
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
        // 流れるメッセージを表示
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.textContent = `${data.username}: ${data.message}`;
        messageElement.style.color = data.color;
        
        // 垂直位置を設定
        messageElement.style.top = `${data.position}%`;
        
        // アニメーション速度を設定（値が大きいほど速い）
        const duration = 12 - data.speed; // 10が最速、2が最遅
        messageElement.style.animationDuration = `${duration}s`;
        
        // 右端から開始するように設定
        messageElement.style.right = '0';
        messageElement.style.left = 'auto';
        
        chatScreen.appendChild(messageElement);
        
        // アニメーション終了後に要素を削除
        messageElement.addEventListener('animationend', function() {
            messageElement.remove();
        });
        
        // 履歴パネルにメッセージを追加
        addToHistory(data);
    }
    
    // 履歴パネルにメッセージを追加する関数
    function addToHistory(data) {
        const historyPanel = document.getElementById('chat-history');
        const historyMessage = document.createElement('div');
        historyMessage.classList.add('history-message');
        
        // タイムスタンプを作成（現在時刻）
        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        const now = new Date();
        timestamp.textContent = now.toLocaleTimeString();
        
        // ユーザー名とメッセージを作成
        const username = document.createElement('span');
        username.classList.add('username');
        username.textContent = data.username;
        username.style.color = data.color;
        
        const message = document.createElement('span');
        message.classList.add('message');
        message.textContent = data.message;
        
        // 要素を追加
        historyMessage.appendChild(timestamp);
        historyMessage.appendChild(username);
        historyMessage.appendChild(document.createTextNode(': '));
        historyMessage.appendChild(message);
        
        // 履歴パネルに追加
        historyPanel.appendChild(historyMessage);
        
        // 自動スクロール
        historyPanel.scrollTop = historyPanel.scrollHeight;
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

    // 背景設定ボタンのイベントリスナー
    const setYoutubeBtn = document.getElementById('set-youtube');
    const removeBackgroundBtn = document.getElementById('remove-background');
    
    if (setYoutubeBtn) {
        setYoutubeBtn.addEventListener('click', function() {
            const youtubeUrl = document.getElementById('id_youtube_url').value.trim();
            if (youtubeUrl) {
                const form = document.querySelector('.video-form');
                form.submit();
            }
        });
    }
    
    if (removeBackgroundBtn) {
        removeBackgroundBtn.addEventListener('click', function() {
            // AJAX request to remove background
            fetch(`/api/room/${roomName}/remove-background/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                }
            });
        });
    }
});
