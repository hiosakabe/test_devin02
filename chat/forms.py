from django import forms
from .models import ChatRoom

class VideoUploadForm(forms.Form):
    video = forms.FileField(
        label='動画をアップロード',
        help_text='最大ファイルサイズ: 10MB',
        required=False
    )
    youtube_url = forms.URLField(
        label='YouTube URL',
        required=False,
        help_text='例: https://www.youtube.com/watch?v=XXXXXXXXXXX'
    )
    
    def clean_video(self):
        video = self.cleaned_data.get('video')
        if video:
            if video.size > 10 * 1024 * 1024:  # 10MB
                raise forms.ValidationError('ファイルサイズが大きすぎます。10MB以下にしてください。')
            if not video.name.endswith(('.mp4', '.webm', '.ogg')):
                raise forms.ValidationError('対応していないファイル形式です。MP4, WebM, Ogg のいずれかを使用してください。')
        return video
    
    def clean(self):
        cleaned_data = super().clean()
        video = cleaned_data.get('video')
        youtube_url = cleaned_data.get('youtube_url')
        
        if video and youtube_url:
            raise forms.ValidationError('動画アップロードとYouTube URLのどちらか一方のみを指定してください。')
        
        return cleaned_data
