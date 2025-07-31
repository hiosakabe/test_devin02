class TranscriptionApp {
    constructor() {
        this.socket = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.isRecording = false;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        
        this.initializeElements();
        this.initializeWebSocket();
        this.setupEventListeners();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.status = document.getElementById('status');
        this.liveScreen = document.getElementById('liveScreen');
        this.historyContent = document.getElementById('historyContent');
        this.textColor = document.getElementById('textColor');
        this.textSpeed = document.getElementById('textSpeed');
        this.textPosition = document.getElementById('textPosition');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.levelFill = document.getElementById('levelFill');
        this.canvasContext = this.waveformCanvas.getContext('2d');
    }

    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/transcription/`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket接続が確立されました');
            this.updateStatus('WebSocket接続完了');
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket接続が閉じられました');
            this.updateStatus('WebSocket接続が切断されました');
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocketエラー:', error);
            this.updateStatus('WebSocket接続エラー');
        };
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    async startRecording() {
        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            this.setupAudioVisualization();
            
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processAudioChunks();
            };
            
            this.mediaRecorder.start(1000);
            
            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.startBtn.classList.add('recording');
            this.updateStatus('🎤 録音中... (波形で音声レベルを確認)');
            
        } catch (error) {
            console.error('マイクアクセスエラー:', error);
            this.updateStatus('マイクへのアクセスが拒否されました');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.audioStream.getTracks().forEach(track => track.stop());
            
            this.stopAudioVisualization();
            
            this.isRecording = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.startBtn.classList.remove('recording');
            this.updateStatus('録音停止');
        }
    }

    async processAudioChunks() {
        if (this.audioChunks.length === 0) return;
        
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'audio_data',
                audio: base64Audio
            }));
        }
        
        this.audioChunks = [];
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'connection_established':
                this.updateStatus('接続完了 - 録音を開始できます');
                break;
                
            case 'transcription':
                this.displayTranscription(data.text, data.timestamp);
                this.addToHistory(data.text, data.timestamp);
                break;
                
            case 'error':
                console.error('サーバーエラー:', data.message);
                this.updateStatus(`エラー: ${data.message}`);
                break;
        }
    }

    displayTranscription(text, timestamp) {
        if (!text || text.trim() === '') return;
        
        const textElement = document.createElement('div');
        textElement.className = 'floating-text';
        textElement.textContent = text;
        textElement.style.color = this.textColor.value;
        
        const position = this.getTextPosition();
        textElement.style.top = position + '%';
        
        const duration = this.getAnimationDuration();
        textElement.style.animationDuration = duration + 's';
        
        this.liveScreen.appendChild(textElement);
        
        textElement.addEventListener('animationend', () => {
            if (textElement.parentNode) {
                textElement.parentNode.removeChild(textElement);
            }
        });
    }

    getTextPosition() {
        const position = this.textPosition.value;
        switch (position) {
            case 'top':
                return Math.random() * 20 + 10; // 10-30%
            case 'middle':
                return Math.random() * 20 + 40; // 40-60%
            case 'bottom':
                return Math.random() * 20 + 70; // 70-90%
            case 'random':
            default:
                return Math.random() * 80 + 10; // 10-90%
        }
    }

    getAnimationDuration() {
        const speed = this.textSpeed.value;
        switch (speed) {
            case 'slow':
                return 15;
            case 'medium':
                return 10;
            case 'fast':
                return 6;
            default:
                return 10;
        }
    }

    addToHistory(text, timestamp) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const timestampElement = document.createElement('div');
        timestampElement.className = 'history-timestamp';
        timestampElement.textContent = new Date(timestamp * 1000).toLocaleTimeString('ja-JP');
        
        const textElement = document.createElement('div');
        textElement.className = 'history-text';
        textElement.textContent = text;
        
        historyItem.appendChild(timestampElement);
        historyItem.appendChild(textElement);
        
        this.historyContent.insertBefore(historyItem, this.historyContent.firstChild);
        
        while (this.historyContent.children.length > 50) {
            this.historyContent.removeChild(this.historyContent.lastChild);
        }
    }

    setupAudioVisualization() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);
            
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.drawWaveform();
        } catch (error) {
            console.error('音声可視化の初期化エラー:', error);
        }
    }

    stopAudioVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.clearCanvas();
        this.levelFill.style.width = '0%';
    }

    drawWaveform() {
        if (!this.isRecording) return;
        
        this.animationId = requestAnimationFrame(() => this.drawWaveform());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.clearCanvas();
        
        const canvas = this.waveformCanvas;
        const ctx = this.canvasContext;
        const width = canvas.width;
        const height = canvas.height;
        
        const barWidth = width / this.dataArray.length;
        let x = 0;
        let maxLevel = 0;
        
        ctx.fillStyle = '#4CAF50';
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * height;
            maxLevel = Math.max(maxLevel, this.dataArray[i]);
            
            const hue = (i / this.dataArray.length) * 120;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth;
        }
        
        const levelPercentage = (maxLevel / 255) * 100;
        this.levelFill.style.width = levelPercentage + '%';
    }

    clearCanvas() {
        const ctx = this.canvasContext;
        ctx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
        
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
    }

    updateStatus(message) {
        this.status.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TranscriptionApp();
});
