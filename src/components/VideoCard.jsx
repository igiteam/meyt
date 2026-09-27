import React from "react";
import { useNavigate } from "react-router-dom"; // Add this import

// Helper function to create embed URL (matching your Tampermonkey script)
const createEmbedUrl = (videoId) => {
  const code = btoa(videoId)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `https://ytembed.macosxjs.com?${code}`;
};

// YouTube thumbnail quality options
const THUMBNAIL_QUALITIES = {
  maxres: "maxresdefault.jpg", // 1280x720 (if available)
  standard: "sddefault.jpg", // 640x480 (if available)
  high: "hqdefault.jpg", // 480x360
  medium: "mqdefault.jpg", // 320x180
  default: "default.jpg", // 120x90
};

// Get thumbnail URL with fallback chain
const getThumbnailUrl = (thumbnails, preferredQuality = "maxres") => {
  if (!thumbnails) return null;

  // If the preferred quality exists, use it
  if (thumbnails[preferredQuality]?.url) {
    return thumbnails[preferredQuality].url;
  }

  // Otherwise, try other qualities in order
  const qualityOrder = ["maxres", "standard", "high", "medium", "default"];
  for (const quality of qualityOrder) {
    if (thumbnails[quality]?.url) {
      return thumbnails[quality].url;
    }
  }

  return null;
};

const VideoCard = ({ video, preferredQuality = "maxres" }) => {
  const navigate = useNavigate(); // Add this hook

  // Safe navigation with fallbacks
  const videoId = video?.id?.videoId;
  const snippet = video?.snippet || {};

  // Get thumbnail with quality preference
  const thumbnails = snippet.thumbnails || {};
  const thumbnailUrl =
    getThumbnailUrl(thumbnails, preferredQuality) ||
    "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages.pond5.com%2Fyoutube-video-player-transparent-background-footage-279015961_iconl.jpeg&f=1&nofb=1&ipt=a6bb954cb2582c2769cf7a2b709900e713a5c47d4ca09a5fc540ed9e680dadcb";

  const title = snippet.title || "Untitled Video";
  const channelTitle = snippet.channelTitle || "Unknown Channel";

  const handleOpenInNewTab = (e) => {
    e.preventDefault();
    if (videoId) {
      window.open(createEmbedUrl(videoId), "_blank");
    }
  };

  const handleChannelClick = (e) => {
    e.stopPropagation(); // Prevent video card click
    // Navigate to channel page using React Router
    if (snippet?.channelId) {
      navigate(`/channel/${snippet.channelId}`);
    } else if (snippet?.channelTitle) {
      // Fallback - try to navigate using channel title as handle
      // Remove spaces and special characters to create a handle
      const handle = snippet.channelTitle
        .replace(/\s+/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
      navigate(`/channel/@${handle}`);
    }
  };

  return (
    <div className="w-[300px] md:w-[320px] h-[300px] md:h-[320px] hover:opacity-80 duration-300 cursor-pointer">
      <div onClick={handleOpenInNewTab}>
        <img
          className="rounded-xl hover:rounded-none w-full h-[170px] md:h-[210px] object-cover duration-300"
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          onError={(e) => {
            e.target.src =
              "https://via.placeholder.com/320x180?text=No+Thumbnail";
          }}
        />

        <div className="p-1">
          <h2 className="text-md mt-2">
            {title.length > 70 ? title.slice(0, 70) + "..." : title}
          </h2>

          {/* Channel - clicking this won't open video */}
          <div onClick={handleChannelClick}>
            <p className="text-sm text-gray-400 py-2 font-semibold hover:text-white cursor-pointer">
              {channelTitle.length > 30
                ? channelTitle.slice(0, 30) + "..."
                : channelTitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
