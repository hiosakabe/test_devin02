import json
import base64
import io
import tempfile
import os
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
import whisper
import torch
import numpy as np
from pydub import AudioSegment

class TranscriptionConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model = whisper.load_model("tiny")
        
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket connection established. Ready for audio data.'
        }))

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data['type'] == 'audio_data':
                audio_data = data['audio']
                await self.process_audio(audio_data)
                
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing audio: {str(e)}'
            }))

    async def process_audio(self, audio_data_base64):
        try:
            audio_bytes = base64.b64decode(audio_data_base64)
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            try:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, 
                    self.transcribe_audio, 
                    temp_file_path
                )
                
                if result and result.strip():
                    await self.send(text_data=json.dumps({
                        'type': 'transcription',
                        'text': result.strip(),
                        'timestamp': asyncio.get_event_loop().time()
                    }))
                    
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error in audio processing: {str(e)}'
            }))

    def transcribe_audio(self, audio_file_path):
        try:
            result = self.model.transcribe(audio_file_path)
            return result["text"]
        except Exception as e:
            return f"Transcription error: {str(e)}"
