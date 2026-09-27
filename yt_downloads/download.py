import sys
import subprocess
import os
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi
import requests
from openai import OpenAI


# Load OpenAI API key from file
def load_api_key():
    try:
        with open("openaikey.txt", "r") as file:
            return file.read().strip()
    except FileNotFoundError:
        print("Error: openaikey.txt not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading API key: {e}")
        sys.exit(1)

# Load OpenAI prompt content from file
def load_prompt():
    try:
        with open("openaiprompt.txt", "r") as file:
            return file.read()
    except FileNotFoundError:
        print("Error: openaiprompt.txt not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading prompt: {e}")
        sys.exit(1)
        
# OpenAI API key
# Initialize OpenAI client
api_key = load_api_key()
openai_client = OpenAI(api_key=api_key)

def download_video(url, output_directory):
    # Command to download using yt-dlp
    command = f'yt-dlp {url} -f "bestvideo[ext=mp4][vcodec!^=av0][vcodec!^=av1]+bestaudio[ext=m4a]" --merge-output-format mp4 -o "{output_directory}/%(title)s.%(ext)s"'
    # Run the command
    try:
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f'Error: Failed to download video. {e}')
        sys.exit(1)

def extract_video_id(url):
    """
    Extract the video ID from a YouTube URL using regex.
    """
    regex = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=)?|youtu\.be\/)([^&\n?#]+)'
    match = re.match(regex, url)
    return match.group(1) if match else None

def get_transcript(video_id):
    """
    Fetch the transcript of a video given its ID.
    """
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        return None

def save_transcript_as_json(transcript, output_file):
    """
    Save the transcript data as a JSON file.
    """
    try:
        with open(output_file, 'w') as f:
            json.dump(transcript, f, indent=4)
    except Exception as e:
        print(f"Error saving transcript to JSON: {e}")

def get_video_title(url):
    """
    Fetch the video title using the oEmbed API.
    """
    oembed_url = f'https://www.youtube.com/oembed?url={url}&format=json'
    try:
        response = requests.get(oembed_url)
        response.raise_for_status()
        data = response.json()
        return data['title']
    except requests.RequestException as e:
        print(f"Error fetching video title: {e}")
        return None

def summarize_text(text):
    """
    Summarize the tutorial text using OpenAI's GPT-3.5-turbo.
    """
    prompt_content = load_prompt()
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                        "content": prompt_content
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0,
            max_tokens=2048
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error summarizing text: {e}")
        return None


def main():
    if len(sys.argv) < 3:
        print('Usage: python download.py <YouTube URL> <output directory>')
        sys.exit(1)

    url = sys.argv[1]
    output_directory = sys.argv[2]

    # Download the video
    download_video(url, output_directory)
    
    # Extract video ID from URL
    video_id = extract_video_id(url)
    if video_id:
        print(f"Extracted video ID: {video_id}")
    else:
        print("Error: Could not extract video ID from URL.")
        sys.exit(1)

    # Get the video title
    video_title = get_video_title(url)
    if video_title:
        print(f"Video title: {video_title}")
    else:
        print("Error: Could not fetch video title.")
        sys.exit(1)

    # Get the transcript
    transcript = get_transcript(video_id)
    if transcript:
        # Save the transcript as a JSON file using the video title
        output_json_file = os.path.join(output_directory, f'{video_title}.f400.json')
        save_transcript_as_json(transcript, output_json_file)
        print(f'Transcript saved to {output_json_file}')
        # Generate the text-only version
        output_text_file = os.path.join(output_directory, f'{video_title}.f600.json')
        full_transcript = " ".join([item["text"] for item in transcript])
        save_transcript_as_json(full_transcript, output_text_file)

        # Summarize the transcript and save as a JSON file
        summary = summarize_text(full_transcript)
        if summary:
            summary_json_file = os.path.join(output_directory, f'{video_title}.f500.json')
            with open(summary_json_file, 'w') as f:
                json.dump({"summary": summary}, f, indent=4)
            print(f'Summary saved to {summary_json_file}')
        else:
            print("Failed to summarize the transcript.")
    else:
        print("Failed to fetch the transcript.")

    sys.exit(0)

if __name__ == "__main__":
    main()
