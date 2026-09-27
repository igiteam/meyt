#!/usr/bin/env python3.10
import os
import re
import sys
import json
import time
import subprocess
from pathlib import Path
from yt_dlp import YoutubeDL
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# --- Settings ---
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
DOWNLOADS_DIR = Path.home() / "Downloads"
LOG_FILE = Path("uploaded_log.json")


# --- Utilities ---
def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def progress_hook(d):
    if d['status'] == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate')
        downloaded = d.get('downloaded_bytes', 0)
        if total:
            percent = downloaded / total * 100
            print(f"\rDownloading: {percent:.1f}%", end='', flush=True)
    elif d['status'] == 'finished':
        print("\nDownload finished!")

def run_ffmpeg_docker(input_paths, output_path: Path):
    workdir = str(output_path.parent.resolve())
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{workdir}:/workdir",
        "jrottenberg/ffmpeg:latest",
        "-y"
    ]
    for f in input_paths:
        docker_cmd += ["-i", f"/workdir/{Path(f).name}"]

    docker_cmd += [
        "-c:v", "copy",
        "-c:a", "copy",
        "-strict", "-2",
        f"/workdir/{output_path.name}"
    ]

    print("Merging video+audio using ffmpeg (Docker)...")
    result = subprocess.run(docker_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg error:", result.stderr)
        raise RuntimeError("ffmpeg merge failed")
    print("Merge complete.")

def download_video(url, resolution="1080"):
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

    with YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        title = sanitize_filename(info.get('title', 'video'))

    video_file = DOWNLOADS_DIR / f"{title}.video"
    audio_file = DOWNLOADS_DIR / f"{title}.audio"
    output_file = DOWNLOADS_DIR / f"{title}.mp4"

    video_format = f"bestvideo[height<={resolution}]"
    audio_format = "bestaudio"

    # Video
    with YoutubeDL({
        'format': video_format,
        'outtmpl': str(video_file),
        'quiet': False,
        'progress_hooks': [progress_hook],
    }) as ydl:
        print(f"\nDownloading video for: {title}")
        ydl.download([url])

    # Audio
    with YoutubeDL({
        'format': audio_format,
        'outtmpl': str(audio_file),
        'quiet': False,
        'progress_hooks': [progress_hook],
    }) as ydl:
        print("Downloading audio...")
        ydl.download([url])

    # Merge
    run_ffmpeg_docker([video_file, audio_file], output_file)

    # Cleanup temp files
    os.remove(video_file)
    os.remove(audio_file)

    return output_file, title


# --- YouTube Upload ---
def authenticate_youtube():
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secrets.json', SCOPES
    )
    credentials = flow.run_local_server(port=0)  # Opens browser for OAuth
    return build('youtube', 'v3', credentials=credentials)


def upload_video(youtube, file_path, title, description="", privacy="private"):
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'categoryId': '22'
        },
        'status': {
            'privacyStatus': privacy,
            "selfDeclaredMadeForKids": False  # 👈 THIS is the COPPA setting
        }
    }

    media = MediaFileUpload(file_path, chunksize=-1, resumable=True)

    print(f"\nUploading '{title}' to YouTube...")
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    print("Upload complete. Video ID:", response['id'])
    return response['id']


# --- Main Processing ---
def main():
    if len(sys.argv) < 2:
        print("Usage: python ytreuploader.py reupload.json")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"File not found: {json_path}")
        sys.exit(1)

    with open(json_path) as f:
        urls = json.load(f)

    # Load previous log
    uploaded_log = {}
    if LOG_FILE.exists():
        uploaded_log = json.loads(LOG_FILE.read_text())

    youtube = authenticate_youtube()

    for url in urls:
        if url in uploaded_log:
            print(f"Already uploaded: {url}")
            continue

        try:
            mp4_path, title = download_video(url)
            privacy = 'unlisted' # set to 'public' or 'unlisted' or 'private'
            video_id = upload_video(youtube, mp4_path, title, description=f"Backup of {url}", privacy=privacy)
            uploaded_log[url] = video_id

            # Save log
            LOG_FILE.write_text(json.dumps(uploaded_log, indent=2))

            # Remove local file
            os.remove(mp4_path)
            print(f"Deleted local file: {mp4_path.name}")

            time.sleep(2)  # avoid quota issues

        except Exception as e:
            print(f"Error processing {url}: {e}")

if __name__ == "__main__":
    main()
