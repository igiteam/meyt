const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files (your HTML file)
app.use(express.static(path.join(__dirname, "public")));

// Serve downloads from the 'downloads' directory
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("WebSocket connection established");

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// POST endpoint to handle download request
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL" });
  }

  try {
    // Output directory for downloaded videos
    const outputDirectory = path.join(__dirname, "downloads");

    // Command to run the yt-dlp Python script
    const command = `python3 download.py "${url}" "${outputDirectory}"`;

    // Execute the command
    const child = exec(command);

    // Handle standard output from the script
    child.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
      // Broadcast progress data to all WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });

    // Handle standard error from the script
    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      // Broadcast error messages to all WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });

    // Handle script exit
    child.on("exit", (code) => {
      if (code === 0) {
        // Assuming the download was successful, construct the download URL
        const fileName = path.basename(url) + ".mp4";
        const downloadUrl = `http://localhost:${PORT}/downloads/${encodeURIComponent(
          fileName
        )}`;
        res.json({ downloadUrl });
      } else {
        res.status(500).json({ error: "Failed to download video" });
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to initiate download" });
  }
});
