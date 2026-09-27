# 🔑 Google OAuth Setup for YouTube Uploader

To upload videos to YouTube, you need to set up a **Google Cloud Project** and obtain OAuth credentials.  
Follow these steps carefully:

---

HOW TO USE?

```bash
python3.10 -m venv myenv
source myenv/bin/activate
docker run --rm jrottenberg/ffmpeg:latest -version
python3.10 -m pip install -r requirements.txt
python3.10 ytreuploader.py ytreuploader_reupload.json
```

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with your Google account.
3. Click **Select a project** → **New Project**.
4. Name it (e.g., `YouTubeUploader`) and create.

---

## 2. Enable the YouTube Data API v3

1. In the Google Cloud Console, go to **APIs & Services → Library**.
2. Search for **YouTube Data API v3**.
3. Click **Enable**.

---

## 3. Configure the OAuth Consent Screen

1. In the left menu, go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (unless this is for a company domain).
3. Fill out the app name, email, and developer contact info.
4. Save and continue until you reach **Test users**.

---

## 4. Add Yourself as a Test User

1. Under **Test users**, click **Add users**.
2. Enter the Gmail account you’ll use (e.g., `youremail@gmail.com`).
3. Save.

⚠️ If you don’t add yourself here, you’ll see **“Access blocked: app has not completed verification”** when running the script.

---

## 5. Create OAuth Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Desktop app** as the application type.
4. Name it (e.g., `YouTubeUploaderDesktop`).
5. Click **Download JSON** → this file is your `ytreuploader_client_secrets.json`.

---

## 6. Place the Secret File

- Move the downloaded JSON into your project folder:
  ```bash
  mv ~/Downloads/client_secret_*.json ytreuploader_client_secrets.json
  ```

```

✅ Now when you run ytreuploader.py, a browser will open for authentication.
Since you added your Gmail as a test user, you’ll be able to grant access and the script will upload videos.



```
