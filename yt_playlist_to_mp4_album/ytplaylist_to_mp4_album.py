#!/usr/bin/env python3
"""
YTPlaylist to MP4 with Cover Uploader - SINGLE VIDEO EDITION
Downloads all songs as MP3, combines into one long MP3, creates ONE MP4 with cover art,
uploads to YouTube with interactive timestamps in description.
"""

import os
import sys
import re
import time
import json
import subprocess
import threading
from pathlib import Path
from datetime import timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass

# Check and install required packages
required_packages = {
    'yt_dlp': 'yt-dlp',
    'PIL': 'Pillow',
    'google_auth_oauthlib': 'google-auth-oauthlib',
    'googleapiclient': 'google-api-python-client',
    'requests': 'requests',
    'mutagen': 'mutagen'
}

missing_packages = []
for package, pip_name in required_packages.items():
    try:
        __import__(package.replace('-', '_'))
    except ImportError:
        missing_packages.append(pip_name)

if missing_packages:
    print(f"📦 Installing required packages: {', '.join(missing_packages)}")
    for package in missing_packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    print("✅ Packages installed successfully!\n")

import requests
from PIL import Image
from yt_dlp import YoutubeDL
from mutagen.mp3 import MP3
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ==================== CONFIGURATION ====================
@dataclass
class Config:
    DOWNLOAD_DIR: Path = Path("./downloads")
    OUTPUT_DIR: Path = Path("./mp4_output")
    UPLOADED_DIR: Path = Path("./uploaded")
    TEMP_DIR: Path = Path("./temp")
    PRIVACY_STATUS: str = "unlisted"
    CATEGORY_ID: str = "10"
    VIDEO_WIDTH: int = 1280
    VIDEO_HEIGHT: int = 720
    FPS: int = 30
    AUDIO_BITRATE: str = "192k"
    VIDEO_BITRATE: str = "2500k"
    USE_DOCKER_FFMPEG: bool = False
    
    def __post_init__(self):
        for dir_path in [self.DOWNLOAD_DIR, self.OUTPUT_DIR, self.UPLOADED_DIR, self.TEMP_DIR]:
            dir_path.mkdir(exist_ok=True, parents=True)

config = Config()

# ==================== FFMPEG HANDLING WITH PROGRESS ====================
class FFmpegProgress:
    def __init__(self, duration: float):
        self.duration = duration
        self.current_time = 0
        self.running = True
        self.last_percent = 0
        
    def parse_progress(self, line: str):
        """Parse FFmpeg progress output"""
        if 'out_time_ms=' in line:
            # Extract time in microseconds
            time_ms = int(line.split('=')[1].strip())
            self.current_time = time_ms / 1000000  # Convert to seconds
            
            if self.duration > 0:
                percent = min(100, int((self.current_time / self.duration) * 100))
                if percent >= self.last_percent + 1:  # Update every 1%
                    self.last_percent = percent
                    # Create progress bar
                    bar_length = 30
                    filled = int(bar_length * percent / 100)
                    bar = '█' * filled + '░' * (bar_length - filled)
                    
                    # Format times
                    current_str = str(timedelta(seconds=int(self.current_time)))
                    duration_str = str(timedelta(seconds=int(self.duration)))
                    
                    # Print progress line
                    print(f"\r  Encoding: [{bar}] {percent}% ({current_str} / {duration_str})", end='', flush=True)
    
    def stop(self):
        self.running = False

def run_ffmpeg_with_progress(args: List[str], duration: float, description: str = "Encoding") -> bool:
    """Run FFmpeg with real-time progress display"""
    
    if config.USE_DOCKER_FFMPEG:
        current_dir = Path.cwd().absolute()
        cmd = ['docker', 'run', '--rm']
        cmd.extend(['-v', f'{current_dir}:{current_dir}', '-w', str(current_dir)])
        cmd.extend(['jrottenberg/ffmpeg', '-y'] + args)
    else:
        cmd = ['ffmpeg', '-y'] + args
    
    # Add progress output
    cmd.extend(['-progress', 'pipe:1', '-nostats'])
    
    print(f"\n{description}...")
    print(f"  Total duration: {str(timedelta(seconds=int(duration)))}")
    
    # Create progress handler
    progress = FFmpegProgress(duration)
    
    try:
        # Run FFmpeg and capture output in real-time
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Read stdout line by line for progress
        for line in process.stdout:
            progress.parse_progress(line)
        
        # Wait for process to complete
        process.wait(timeout=3600)
        
        # Print newline after progress bar
        print()  # Move to next line
        
        if process.returncode != 0:
            # Read stderr for error
            stderr = process.stderr.read()
            print(f"  ❌ FFmpeg error: {stderr[:200]}")
            return False
        
        return True
        
    except subprocess.TimeoutExpired:
        print("\n  ❌ FFmpeg timed out after 1 hour")
        process.kill()
        return False
    except Exception as e:
        print(f"\n  ❌ FFmpeg error: {e}")
        return False

def run_ffmpeg_simple(args: List[str], description: str = "Processing") -> bool:
    """Run FFmpeg without progress (for quick operations)"""
    
    if config.USE_DOCKER_FFMPEG:
        current_dir = Path.cwd().absolute()
        cmd = ['docker', 'run', '--rm']
        cmd.extend(['-v', f'{current_dir}:{current_dir}', '-w', str(current_dir)])
        cmd.extend(['jrottenberg/ffmpeg', '-y'] + args)
    else:
        cmd = ['ffmpeg', '-y'] + args
    
    print(f"\n{description}...")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"  ❌ Error: {result.stderr[:200]}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print("  ❌ Timed out")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_docker_ffmpeg():
    """Check if Docker FFmpeg is available"""
    try:
        subprocess.run(['docker', '--version'], capture_output=True, check=True)
        result = subprocess.run(['docker', 'image', 'inspect', 'jrottenberg/ffmpeg'], 
                              capture_output=True)
        if result.returncode != 0:
            print("📦 Pulling FFmpeg Docker image...")
            subprocess.run(['docker', 'pull', 'jrottenberg/ffmpeg'], check=True)
        return True
    except:
        return False

# ==================== UTILITIES ====================
def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'[\n\r\t]', ' ', name)
    return name.strip()[:200]

def format_time(seconds: float) -> str:
    td = timedelta(seconds=int(seconds))
    hours = td.seconds // 3600
    minutes = (td.seconds % 3600) // 60
    secs = td.seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def setup_cookie_handling():
    cookie_file = Path("cookies.txt")
    if cookie_file.exists():
        print(f"🔑 Using cookies from: {cookie_file}")
        return {'cookiefile': str(cookie_file)}
    
    browser_options = ['chrome', 'firefox', 'edge', 'brave', 'safari']
    for browser in browser_options:
        try:
            test_opts = {'cookiesfrombrowser': (browser,), 'quiet': True}
            with YoutubeDL(test_opts) as ydl:
                pass
            print(f"🔑 Using cookies from browser: {browser}")
            return {'cookiesfrombrowser': (browser,)}
        except Exception:
            continue
    
    print("⚠️  No cookies found. Some videos may be restricted.")
    return {}

def extract_playlist_id(input_str: str) -> Optional[str]:
    input_str = input_str.strip()
    
    if 'youtube.com' in input_str or 'youtu.be' in input_str:
        if 'list=' in input_str:
            match = re.search(r'list=([a-zA-Z0-9_-]+)', input_str)
            if match:
                return match.group(1)
        return None
    
    if re.match(r'^[a-zA-Z0-9_-]+$', input_str):
        return input_str
    
    return None

# ==================== YOUTUBE PLAYLIST EXTRACTION ====================
def extract_playlist_videos(playlist_id: str) -> List[Dict]:
    print(f"\n🎬 Extracting videos from playlist...")
    
    playlist_id = re.sub(r'[^a-zA-Z0-9_-]', '', playlist_id.strip())
    if not playlist_id:
        print("❌ Invalid playlist ID")
        return []
    
    playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
    videos = []
    cookie_config = setup_cookie_handling()
    
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        **cookie_config
    }
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            playlist_info = ydl.extract_info(playlist_url, download=False)
            
            if 'entries' in playlist_info:
                for idx, entry in enumerate(playlist_info['entries'], 1):
                    if entry:
                        video = {
                            'id': entry.get('id'),
                            'title': sanitize_filename(entry.get('title', f'video_{idx}')),
                            'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                            'duration': entry.get('duration', 0),
                            'index': idx
                        }
                        videos.append(video)
                        print(f"  [{idx:3d}] {video['title'][:60]}...")
            
            print(f"\n✅ Found {len(videos)} videos")
            return videos
            
    except Exception as e:
        print(f"❌ Failed to extract playlist: {e}")
        return []

# ==================== MP3 DOWNLOAD ====================
def download_audio(video_url: str, output_path: Path) -> Optional[Path]:
    """Download best audio format and convert to MP3"""
    print(f"\n  Downloading audio...")
    
    cookie_config = setup_cookie_handling()
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(output_path.with_suffix('')),
        'quiet': True,
        'no_warnings': True,
        'retries': 3,
        'postprocessors': [],
        **cookie_config
    }
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        
        # Find the downloaded file
        downloaded_file = None
        for ext in ['.webm', '.m4a', '.opus', '.ogg', '.mp4']:
            test_path = output_path.with_suffix(ext)
            if test_path.exists():
                downloaded_file = test_path
                break
        
        if not downloaded_file:
            for file in config.DOWNLOAD_DIR.glob(f"{output_path.stem}*"):
                if file.suffix != '.mp3':
                    downloaded_file = file
                    break
        
        if not downloaded_file:
            print(f"    ❌ No downloaded file found")
            return None
        
        # Convert to MP3
        mp3_path = output_path.with_suffix('.mp3')
        ffmpeg_args = [
            '-i', str(downloaded_file),
            '-acodec', 'libmp3lame',
            '-ab', '192k',
            '-ar', '44100',
            '-ac', '2',
            '-y',
            str(mp3_path)
        ]
        
        if run_ffmpeg_simple(ffmpeg_args, "  Converting to MP3"):
            if mp3_path.exists():
                downloaded_file.unlink()
                return mp3_path
        return None
            
    except Exception as e:
        print(f"    ❌ Download failed: {e}")
        return None

def get_mp3_duration(mp3_path: Path) -> float:
    """Get duration of MP3 file in seconds"""
    try:
        audio = MP3(mp3_path)
        return audio.info.length
    except:
        try:
            if config.USE_DOCKER_FFMPEG:
                current_dir = Path.cwd().absolute()
                cmd = [
                    'docker', 'run', '--rm',
                    '-v', f'{current_dir}:{current_dir}',
                    '-w', str(current_dir),
                    'jrottenberg/ffmpeg',
                    'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', str(mp3_path)
                ]
            else:
                cmd = [
                    'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', str(mp3_path)
                ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0 and result.stdout.strip():
                return float(result.stdout.strip())
        except:
            pass
        return 180

# ==================== COMBINE MP3S - FIXED VERSION ====================
def combine_mp3s(mp3_files: List[Path], output_path: Path) -> bool:
    """Combine multiple MP3 files into one using FFmpeg with re-encoding to ensure proper joining"""
    print(f"\n🎵 Combining {len(mp3_files)} MP3 files into one...")
    
    # Create a temporary directory for normalized MP3s
    temp_normalized_dir = config.TEMP_DIR / "normalized_mp3s"
    temp_normalized_dir.mkdir(exist_ok=True)
    
    normalized_files = []
    
    # First, normalize all MP3s to the same format
    print("  Normalizing audio files...")
    for i, mp3 in enumerate(mp3_files, 1):
        normalized_path = temp_normalized_dir / f"part_{i:04d}.mp3"
        
        # Convert to consistent format: 44.1kHz, stereo, constant bitrate
        ffmpeg_args = [
            '-i', str(mp3),
            '-acodec', 'libmp3lame',
            '-ab', '192k',
            '-ar', '44100',
            '-ac', '2',
            '-y',
            str(normalized_path)
        ]
        
        if run_ffmpeg_simple(ffmpeg_args, f"    [{i}/{len(mp3_files)}]"):
            normalized_files.append(normalized_path)
        else:
            print(f"    ❌ Failed to normalize {mp3.name}")
            return False
    
    # Create concat file with normalized MP3s
    concat_file = config.TEMP_DIR / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for mp3 in normalized_files:
            f.write(f"file '{mp3.absolute()}'\n")
    
    # Use concat demuxer with re-encoding to ensure seamless join
    ffmpeg_args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', str(concat_file),
        '-acodec', 'libmp3lame',
        '-ab', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-y',
        str(output_path)
    ]
    
    success = run_ffmpeg_simple(ffmpeg_args, "  Combining (re-encoding)")
    
    # Cleanup
    concat_file.unlink(missing_ok=True)
    for f in normalized_files:
        f.unlink(missing_ok=True)
    temp_normalized_dir.rmdir()
    
    if success and output_path.exists():
        file_size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ Combined MP3 created: {output_path.name} ({file_size_mb:.1f} MB)")
        return True
    
    return False

# ==================== MP4 CONVERSION ====================
def validate_cover_image(image_path: Path) -> bool:
    try:
        img = Image.open(image_path)
        width, height = img.size
        if width != height:
            print(f"❌ Cover must be SQUARE! Current: {width}x{height}")
            return False
        print(f"✅ Cover validated: {width}x{height}")
        return True
    except Exception as e:
        print(f"❌ Invalid image: {e}")
        return False

def get_cover_image(cover_input: str) -> Optional[Path]:
    """Get cover image from URL or local path"""
    if cover_input.startswith(('http://', 'https://')):
        print(f"📥 Downloading cover from URL...")
        try:
            response = requests.get(cover_input, timeout=30)
            response.raise_for_status()
            
            temp_cover = config.DOWNLOAD_DIR / f"cover_{int(time.time())}.jpg"
            temp_cover.write_bytes(response.content)
            
            if validate_cover_image(temp_cover):
                return temp_cover
            else:
                temp_cover.unlink(missing_ok=True)
                return None
        except Exception as e:
            print(f"❌ Download failed: {e}")
            return None
    
    cover_path = Path(cover_input)
    if cover_path.exists():
        if validate_cover_image(cover_path):
            return cover_path
    else:
        print(f"❌ File not found: {cover_input}")
    return None

def resize_and_prepare_cover(input_path: Path, output_path: Path, target_size: int = 720) -> bool:
    try:
        img = Image.open(input_path)
        
        if img.width != img.height:
            size = min(img.width, img.height)
            left = (img.width - size) // 2
            top = (img.height - size) // 2
            img = img.crop((left, top, left + size, top + size))
        
        img = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', (config.VIDEO_WIDTH, config.VIDEO_HEIGHT), 'black')
        x = (config.VIDEO_WIDTH - target_size) // 2
        y = (config.VIDEO_HEIGHT - target_size) // 2
        canvas.paste(img, (x, y))
        canvas.save(output_path, 'JPEG', quality=95)
        return True
    except Exception as e:
        print(f"❌ Failed to prepare cover: {e}")
        return False

def create_mp4_from_mp3_and_cover(mp3_path: Path, cover_path: Path, output_path: Path, duration: float) -> Optional[Path]:
    """Create MP4 video from MP3 audio and cover image with progress display"""
    
    temp_cover = config.TEMP_DIR / f"temp_cover_{int(time.time())}.jpg"
    if not resize_and_prepare_cover(cover_path, temp_cover):
        return None
    
    # Verify MP3 duration first
    actual_duration = get_mp3_duration(mp3_path)
    print(f"\n  Audio duration: {str(timedelta(seconds=int(actual_duration)))}")
    print(f"  Target duration: {str(timedelta(seconds=int(duration)))}")
    
    # Use actual duration for encoding
    encode_duration = actual_duration if actual_duration > 0 else duration
    
    ffmpeg_args = [
        '-loop', '1',
        '-i', str(temp_cover),
        '-i', str(mp3_path),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', config.AUDIO_BITRATE,
        '-b:v', config.VIDEO_BITRATE,
        '-pix_fmt', 'yuv420p',
        '-r', str(config.FPS),
        '-shortest',
        '-movflags', '+faststart',
        str(output_path)
    ]
    
    # Use the progress-enabled FFmpeg runner
    success = run_ffmpeg_with_progress(ffmpeg_args, encode_duration, "🎬 Creating MP4 video")
    
    if success and output_path.exists():
        file_size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"\n✅ MP4 created: {output_path.name} ({file_size_mb:.1f} MB)")
        temp_cover.unlink(missing_ok=True)
        return output_path
    else:
        print(f"\n❌ MP4 creation failed")
        temp_cover.unlink(missing_ok=True)
        return None

# ==================== TIMESTAMP GENERATION ====================
def generate_timestamp_description(videos: List[Dict], playlist_title: str, total_duration: float) -> str:
    """Generate YouTube description with interactive timestamps"""
    description = f"{playlist_title}\n\n"
    
    for video in videos:
        start_time = format_time(video['start_time'])
        # YouTube requires: TIMESTAMP first, then title
        description += f"{start_time} {video['title']}\n"
    
    description += f"\nTotal Duration: {format_time(total_duration)}\n"
    
    return description

# ==================== YOUTUBE UPLOAD ====================
def authenticate_youtube():
    print("\n🔐 Authenticating with YouTube...")
    
    cred_files = ['client_secrets.json', 'credentials.json']
    cred_file = None
    for file in cred_files:
        if Path(file).exists():
            cred_file = file
            break
    
    if not cred_file:
        print("\n❌ No client_secrets.json found!")
        print("Get it from: https://console.cloud.google.com/")
        return None
    
    try:
        SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
        flow = InstalledAppFlow.from_client_secrets_file(cred_file, SCOPES)
        credentials = flow.run_local_server(port=8080)
        print("✅ Authenticated successfully!")
        return build('youtube', 'v3', credentials=credentials)
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        return None

def upload_to_youtube(youtube, video_path: Path, title: str, description: str) -> bool:
    print(f"\n📤 Uploading to YouTube...")
    print(f"  Title: {title[:60]}...")
    print(f"  File size: {video_path.stat().st_size / (1024*1024):.1f} MB")
    
    body = {
        'snippet': {
            'title': title[:100],
            'description': description[:5000],
            'categoryId': config.CATEGORY_ID
        },
        'status': {
            'privacyStatus': config.PRIVACY_STATUS,
            'selfDeclaredMadeForKids': False
        }
    }
    
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True)
    
    try:
        request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
        response = None
        last_progress = 0
        start_time = time.time()
        
        print()  # New line for progress bar
        
        while response is None:
            status, response = request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                if progress > last_progress:
                    last_progress = progress
                    
                    # Create progress bar
                    bar_length = 30
                    filled = int(bar_length * progress / 100)
                    bar = '█' * filled + '░' * (bar_length - filled)
                    
                    # Calculate upload speed
                    elapsed = time.time() - start_time
                    uploaded_mb = (progress / 100) * (video_path.stat().st_size / (1024*1024))
                    speed = uploaded_mb / elapsed if elapsed > 0 else 0
                    
                    # Print progress line
                    print(f"\r  Upload: [{bar}] {progress}% ({uploaded_mb:.1f}/{video_path.stat().st_size / (1024*1024):.1f} MB @ {speed:.1f} MB/s)", end='', flush=True)
        
        print()  # New line after progress
        print(f"✅ Uploaded! Video ID: {response['id']}")
        print(f"  URL: https://www.youtube.com/watch?v={response['id']}")
        return True
    except Exception as e:
        print(f"\n❌ Upload failed: {e}")
        return False

# ==================== MAIN PROCESSING ====================
def process_playlist(playlist_id: str, cover_path: Path, playlist_title: str):
    # Extract playlist videos
    videos = extract_playlist_videos(playlist_id)
    if not videos:
        return False
    
    print(f"\n🎯 Will download {len(videos)} songs and combine into single video")
    
    # Download all MP3s first
    print(f"\n{'='*60}")
    print("📥 PHASE 1: Downloading all songs as MP3")
    print(f"{'='*60}")
    
    mp3_files = []
    failed_downloads = []
    
    for idx, video in enumerate(videos, 1):
        print(f"\n[{idx}/{len(videos)}] {video['title']}")
        
        safe_title = sanitize_filename(video['title'])
        mp3_path = config.DOWNLOAD_DIR / f"{safe_title}.mp3"
        
        if mp3_path.exists():
            print(f"  ✅ Already downloaded: {mp3_path.name}")
            duration = get_mp3_duration(mp3_path)
        else:
            mp3_path = download_audio(video['url'], mp3_path)
            if not mp3_path:
                print(f"  ❌ Failed to download")
                failed_downloads.append(video['title'])
                continue
            duration = get_mp3_duration(mp3_path)
        
        video['duration'] = duration
        video['mp3_path'] = mp3_path
        mp3_files.append(mp3_path)
    
    if not mp3_files:
        print("\n❌ No songs were successfully downloaded")
        return False
    
    if failed_downloads:
        print(f"\n⚠️  Failed to download {len(failed_downloads)} songs")
    
    # Combine all MP3s into one
    print(f"\n{'='*60}")
    print("🎵 PHASE 2: Combining all MP3s into single audio file")
    print(f"{'='*60}")
    
    combined_mp3 = config.OUTPUT_DIR / f"{playlist_title}_full_playlist.mp3"
    
    if combined_mp3.exists():
        print(f"✅ Combined MP3 already exists: {combined_mp3.name}")
    else:
        if not combine_mp3s(mp3_files, combined_mp3):
            print("❌ Failed to combine MP3s")
            return False
    
    # Calculate timestamps and total duration
    print(f"\n{'='*60}")
    print("⏱️  PHASE 3: Calculating timestamps")
    print(f"{'='*60}")
    
    # Get the actual duration of the combined MP3
    total_duration = get_mp3_duration(combined_mp3)
    
    # Calculate timestamps proportionally based on actual total duration
    original_total = sum(v.get('duration', 0) for v in videos if v.get('mp3_path'))
    
    current_time = 0
    for video in videos:
        if video.get('mp3_path'):
            # Calculate proportional time if total duration differs from original
            if original_total > 0:
                proportional_time = (video['duration'] / original_total) * total_duration
            else:
                proportional_time = video['duration']
            
            video['start_time'] = current_time
            video['end_time'] = current_time + proportional_time
            current_time += proportional_time
            
            print(f"  {video['title'][:50]}... {format_time(video['start_time'])} - {format_time(video['end_time'])}")
    
    print(f"\n  Total playlist duration: {format_time(total_duration)}")
    
    # Create MP4 video (with progress bar!)
    print(f"\n{'='*60}")
    print("🎬 PHASE 4: Creating MP4 video with cover art")
    print(f"{'='*60}")
    
    mp4_output = config.OUTPUT_DIR / f"{playlist_title}.mp4"
    
    if mp4_output.exists():
        print(f"✅ MP4 already exists: {mp4_output.name}")
    else:
        if not create_mp4_from_mp3_and_cover(combined_mp3, cover_path, mp4_output, total_duration):
            print("❌ Failed to create MP4")
            return False
    
    # Generate description with timestamps
    print(f"\n{'='*60}")
    print("📝 PHASE 5: Generating description with timestamps")
    print(f"{'='*60}")
    
    successful_videos = [v for v in videos if v.get('mp3_path')]
    description = generate_timestamp_description(successful_videos, playlist_title, total_duration)
    
    print("\nDescription preview:")
    print("-" * 40)
    print(description[:500])
    if len(description) > 500:
        print(f"... and {len(description)-500} more characters")
    print("-" * 40)
    
    # Save description to file
    desc_file = config.OUTPUT_DIR / f"{playlist_title}_description.txt"
    desc_file.write_text(description)
    print(f"\n📝 Full description saved to: {desc_file}")
    
    # Upload to YouTube
    print(f"\n{'='*60}")
    print("📤 PHASE 6: Uploading to YouTube")
    print(f"{'='*60}")
    
    youtube = authenticate_youtube()
    
    if youtube:
        video_title = f"{playlist_title} - Full Playlist"
        if upload_to_youtube(youtube, mp4_output, video_title, description):
            print(f"\n✨ Complete! Video uploaded to YouTube!")
            return True
        else:
            print(f"\n⚠️  Upload failed, but MP4 file is saved at: {mp4_output}")
            return False
    else:
        print(f"\n⚠️  Skipping upload, MP4 file is saved at: {mp4_output}")
        return False

# ==================== MAIN ====================
def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║     🎬 YT PLAYLIST TO MP4 WITH COVER UPLOADER 🎬        ║
║                  SINGLE VIDEO EDITION                   ║
║                                                        ║
║  Downloads entire playlist as MP3s, combines into     ║
║  one long MP3, creates single MP4 with cover art,     ║
║  uploads to YouTube with interactive timestamps!      ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    if len(sys.argv) >= 3:
        playlist_input = sys.argv[1]
        cover_input = sys.argv[2]
        playlist_title = sys.argv[3] if len(sys.argv) > 3 else None
        
        playlist_id = extract_playlist_id(playlist_input)
        if not playlist_id:
            print(f"❌ Invalid playlist ID: {playlist_input}")
            sys.exit(1)
        
        cover_path = get_cover_image(cover_input)
        if not cover_path:
            sys.exit(1)
        
        if not playlist_title:
            playlist_title = f"Playlist_{playlist_id[:8]}"
        
        config.USE_DOCKER_FFMPEG = check_docker_ffmpeg()
        if config.USE_DOCKER_FFMPEG:
            print("✅ Using Docker FFmpeg")
        else:
            print("⚠️  Docker FFmpeg not available, using system FFmpeg")
        
        success = process_playlist(playlist_id, cover_path, playlist_title)
        
        if success:
            print(f"\n🎉 COMPLETE! Check your YouTube channel!")
        else:
            print(f"\n⚠️  Processing failed")
            sys.exit(1)
    else:
        print("Usage: python ytplaylist_to_mp4_album.py PLAYLIST_ID COVER_URL [TITLE]")
        print("\nExample:")
        print("  python ytplaylist_to_mp4_album.py PLb8oNKiUbnjEwIzLLV84OQ6fPwTdlEzZ6 https://example.com/cover.jpg \"My Playlist\"")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# 🎬 The Original CLI Tool
#     One command: python script.py PLAYLIST_ID COVER_URL "Title"
#     Downloads ALL songs as individual MP3s
#     Combines into ONE seamless audio file
#     Creates MP4 with centered square album art on black background
#     Generates clickable YouTube timestamps for EVERY song
#     Uploads directly to YouTube with progress bars

# 🐳 Docker FFmpeg Support
#     No system FFmpeg installation needed
#     Auto-pulls jrottenberg/ffmpeg image
#     Works everywhere Docker runs

# 🍪 Cookie Handling
#     Auto-detects browser cookies (Chrome/Firefox/Safari/Edge/Brave)
#     Accesses age-restricted and private videos
#     Falls back gracefully

# The Core Innovation: YouTube Playlist → Single MP4 with Smart Timestamps

# Most people think of downloading playlists as individual files. 
#But we said FUCK THAT - let's make it a single, seamless video 
#with clickable chapters that YouTube automatically recognizes!

# The Technical Masterpiece:
# Playlist URL + Square Cover Art
#            ↓
#     Extract 22+ videos
#            ↓
#     Download ALL as MP3s
#            ↓
#     Combine into ONE MP3 (gapless!)
#            ↓
#     Create MP4 with centered album art
#            ↓
#     Generate PERFECT timestamps:
#     "Song 1 00:00 - 03:35"
#     "Song 2 03:36 - 07:12"
#            ↓
#     Upload to YouTube
#            ↓
#     Viewers can SKIP to any song by clicking!

# Why this is GENIUS:
#     YouTube's native chapter system - Just timestamps in description = clickable navigation
#     No more fragmented playlists - One video, one URL, one share
#     Album art stays visible - Static cover = constant branding
#     Perfect for: Albums, DJ mixes, audiobooks, podcasts, soundtracks