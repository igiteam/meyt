import axios from "axios";
import React, { createContext, useState } from "react";

export const YoutubeContext = createContext();

// CONFIGURABLE LIMITS - Change these as needed!
const DEFAULTS = {
  SEARCH_MAX: 500, // Max search results (default 500)
  CHANNEL_VIDEOS_MAX: 5000, // Max videos from channel
  PLAYLIST_ITEMS_MAX: 5000, // Max playlist items
  RELATED_VIDEOS_MAX: 500, // Related videos max
  COMMENTS_MAX: 100, // Comments max if you add later
};

const YoutubeContextProvider = ({ children }) => {
  const [activeCategory, setActiveCategory] = useState("New");

  // Google YouTube API v3 base URL
  const BASE_URL = "https://www.googleapis.com/youtube/v3";

  // Helper function to get channel ID from handle
  const getChannelIdFromHandle = async (handle) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

      const cleanHandle = handle.replace("@", "").trim();

      const response = await axios.get(`${BASE_URL}/channels`, {
        params: {
          part: "id",
          forHandle: cleanHandle,
          key: API_KEY,
        },
      });

      if (response.data.items && response.data.items.length > 0) {
        const channelId = response.data.items[0].id;
        console.log(`✅ Resolved ${handle} → ${channelId}`);
        return channelId;
      }

      console.warn(`❌ No channel found for handle: ${handle}`);
      return null;
    } catch (error) {
      console.error(
        "Error resolving channel handle:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  // Get the uploads playlist ID for a channel
  const getUploadsPlaylistId = async (channelId) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

      const response = await axios.get(`${BASE_URL}/channels`, {
        params: {
          key: API_KEY,
          id: channelId,
          part: "contentDetails",
        },
      });

      if (response.data.items && response.data.items.length > 0) {
        const uploadsPlaylistId =
          response.data.items[0].contentDetails.relatedPlaylists.uploads;
        console.log(
          `✅ Got uploads playlist: ${uploadsPlaylistId} for channel: ${channelId}`
        );
        return uploadsPlaylistId;
      }

      return null;
    } catch (error) {
      console.error("Error getting uploads playlist:", error);
      return null;
    }
  };

  // Fetch ALL search results with pagination
  const fetchAllSearchResults = async (
    query,
    maxResults = DEFAULTS.SEARCH_MAX
  ) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
      let allItems = [];
      let nextPageToken = null;
      let pageCount = 0;

      console.log(`🔍 Searching for: "${query}" (max: ${maxResults} videos)`);

      do {
        pageCount++;
        const params = {
          key: API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 50, // API max per page
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await axios.get(`${BASE_URL}/search`, { params });

        if (response.data.items) {
          allItems = [...allItems, ...response.data.items];
          nextPageToken = response.data.nextPageToken;

          console.log(
            `📥 Page ${pageCount}: Fetched ${allItems.length} search results so far...`
          );
        } else {
          break;
        }

        // Stop if we've reached the configured max
        if (allItems.length >= maxResults) {
          console.log(`✅ Reached max results limit: ${maxResults}`);
          break;
        }

        // YouTube API has a hard limit of ~500 results total
        if (allItems.length >= 500) {
          console.log(`⚠️ Reached YouTube API hard limit of 500 results`);
          break;
        }
      } while (nextPageToken);

      console.log(
        `✅ Total fetched: ${allItems.length} search results for "${query}" (${pageCount} pages)`
      );

      return {
        items: allItems,
        totalCount: allItems.length,
        nextPageToken: nextPageToken,
        pageCount: pageCount,
      };
    } catch (error) {
      console.error(
        "Error fetching search results:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  // Fetch ALL related videos with pagination
  const fetchAllRelatedVideos = async (
    videoId,
    maxResults = DEFAULTS.RELATED_VIDEOS_MAX
  ) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
      let allItems = [];
      let nextPageToken = null;
      let pageCount = 0;

      console.log(
        `🔍 Fetching related videos for: ${videoId} (max: ${maxResults})`
      );

      do {
        pageCount++;
        const params = {
          key: API_KEY,
          relatedToVideoId: videoId,
          part: "snippet",
          type: "video",
          maxResults: 50,
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await axios.get(`${BASE_URL}/search`, { params });

        if (response.data.items) {
          allItems = [...allItems, ...response.data.items];
          nextPageToken = response.data.nextPageToken;
          console.log(
            `📥 Page ${pageCount}: Fetched ${allItems.length} related videos so far...`
          );
        } else {
          break;
        }

        if (allItems.length >= maxResults || allItems.length >= 500) {
          break;
        }
      } while (nextPageToken);

      return {
        items: allItems,
        totalCount: allItems.length,
        nextPageToken: nextPageToken,
        pageCount: pageCount,
      };
    } catch (error) {
      console.error("Error fetching related videos:", error);
      return null;
    }
  };

  // Fetch ALL channel videos using the uploads playlist
  const fetchChannelVideos = async (
    channelIdentifier,
    maxResults = DEFAULTS.CHANNEL_VIDEOS_MAX
  ) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

      // Resolve channel ID if handle was provided
      let channelId = channelIdentifier;
      if (
        typeof channelIdentifier === "string" &&
        channelIdentifier.includes("@")
      ) {
        channelId = await getChannelIdFromHandle(channelIdentifier);
        if (!channelId) return null;
      }

      // Get the uploads playlist ID first
      const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
      if (!uploadsPlaylistId) {
        console.error("Could not find uploads playlist for channel");
        return null;
      }

      // Now fetch all videos from the uploads playlist with pagination
      let allVideos = [];
      let nextPageToken = null;
      let pageCount = 0;

      console.log(
        `📦 Fetching ALL videos for channel: ${channelId} (max: ${maxResults})`
      );

      do {
        pageCount++;
        const params = {
          key: API_KEY,
          part: "snippet",
          playlistId: uploadsPlaylistId,
          maxResults: 50, // API max per page
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await axios.get(`${BASE_URL}/playlistItems`, {
          params,
        });

        if (response.data.items) {
          // Transform playlist items to match the video format expected by components
          const transformedVideos = response.data.items.map((item) => ({
            id: { videoId: item.snippet.resourceId.videoId },
            snippet: {
              ...item.snippet,
              channelId: item.snippet.channelId,
              publishedAt: item.snippet.publishedAt,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnails: item.snippet.thumbnails,
              channelTitle: item.snippet.channelTitle,
            },
          }));

          allVideos = [...allVideos, ...transformedVideos];
          nextPageToken = response.data.nextPageToken;

          console.log(
            `📥 Page ${pageCount}: Fetched ${allVideos.length} videos so far...`
          );
        } else {
          break;
        }

        // Stop if we've reached the configured max
        if (allVideos.length >= maxResults) {
          console.log(`✅ Reached max results limit: ${maxResults}`);
          break;
        }
      } while (nextPageToken);

      console.log(
        `✅ Total fetched: ${allVideos.length} videos for channel ${channelId} (${pageCount} pages)`
      );

      return {
        items: allVideos,
        totalCount: allVideos.length,
        nextPageToken: nextPageToken,
        pageCount: pageCount,
      };
    } catch (error) {
      console.error(
        "Error fetching channel videos:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  // Fetch ALL playlist items with pagination
  const fetchAllPlaylistItems = async (
    playlistId,
    maxResults = DEFAULTS.PLAYLIST_ITEMS_MAX
  ) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
      let allItems = [];
      let nextPageToken = null;
      let pageCount = 0;

      console.log(
        `📦 Fetching playlist: ${playlistId} (max: ${maxResults} videos)`
      );

      do {
        pageCount++;
        const params = {
          key: API_KEY,
          part: "snippet,contentDetails",
          playlistId: playlistId,
          maxResults: 50,
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await axios.get(`${BASE_URL}/playlistItems`, {
          params,
        });

        if (response.data.items) {
          allItems = [...allItems, ...response.data.items];
          nextPageToken = response.data.nextPageToken;

          console.log(
            `📥 Page ${pageCount}: Fetched ${allItems.length} videos so far...`
          );
        } else {
          break;
        }

        if (allItems.length >= maxResults) {
          console.log(`✅ Reached max results limit: ${maxResults}`);
          break;
        }
      } while (nextPageToken);

      console.log(
        `✅ Total fetched: ${allItems.length} videos (${pageCount} pages)`
      );

      return {
        items: allItems,
        totalCount: allItems.length,
        hasMore: !!nextPageToken && allItems.length < maxResults,
        nextPageToken: nextPageToken,
        pageCount: pageCount,
      };
    } catch (error) {
      console.error(
        "Error fetching playlist items:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  // Main fetch function with pagination support
  const fetchData = async (input, type = "search", options = {}) => {
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

      if (!API_KEY) {
        console.error("❌ Google API key is missing!");
        return null;
      }

      // Channel videos - uses uploads playlist method with pagination
      if (type === "channelVideos") {
        const maxResults = options.maxResults || DEFAULTS.CHANNEL_VIDEOS_MAX;
        return await fetchChannelVideos(input, maxResults);
      }

      // Search - with pagination to get more results
      if (type === "search") {
        const maxResults = options.maxResults || DEFAULTS.SEARCH_MAX;

        // If getAllResults is true, fetch all pages
        if (options.getAllResults) {
          return await fetchAllSearchResults(input, maxResults);
        }

        // Otherwise just get one page (faster)
        const response = await axios.get(`${BASE_URL}/search`, {
          params: {
            key: API_KEY,
            q: input,
            part: "snippet",
            type: "video",
            maxResults: Math.min(maxResults, 50),
            pageToken: options.pageToken || null,
          },
        });
        return response.data;
      }

      // Playlist details
      if (type === "playlist") {
        const response = await axios.get(`${BASE_URL}/playlists`, {
          params: {
            key: API_KEY,
            part: "snippet,contentDetails",
            id: input,
          },
        });
        return response.data;
      }

      // Playlist items with pagination
      if (type === "playlistItems") {
        const maxResults = options.maxResults || DEFAULTS.PLAYLIST_ITEMS_MAX;

        if (options.getAllResults) {
          return await fetchAllPlaylistItems(input, maxResults);
        }

        const response = await axios.get(`${BASE_URL}/playlistItems`, {
          params: {
            key: API_KEY,
            part: "snippet,contentDetails",
            playlistId: input,
            maxResults: Math.min(maxResults, 50),
            pageToken: options.pageToken || null,
          },
        });
        return response.data;
      }

      // Video details
      if (type === "videos") {
        const response = await axios.get(`${BASE_URL}/videos`, {
          params: {
            key: API_KEY,
            id: input,
            part: "snippet,statistics",
          },
        });
        return response.data;
      }

      // Related videos with pagination
      if (type === "related") {
        const maxResults = options.maxResults || DEFAULTS.RELATED_VIDEOS_MAX;

        if (options.getAllResults) {
          return await fetchAllRelatedVideos(input, maxResults);
        }

        const response = await axios.get(`${BASE_URL}/search`, {
          params: {
            key: API_KEY,
            relatedToVideoId: input,
            part: "snippet",
            type: "video",
            maxResults: Math.min(maxResults, 50),
            pageToken: options.pageToken || null,
          },
        });
        return response.data;
      }

      // Channel details
      if (type === "channels") {
        let channelId = input;
        if (typeof input === "string" && input.includes("@")) {
          channelId = await getChannelIdFromHandle(input);
          if (!channelId) return null;
        }

        const response = await axios.get(`${BASE_URL}/channels`, {
          params: {
            key: API_KEY,
            id: channelId,
            part: "snippet,statistics,brandingSettings",
          },
        });
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(
        "❌ YouTube API Error:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  function convertNumber(number) {
    if (!number) return "0";
    const num = parseInt(number);

    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    } else {
      return num.toString();
    }
  }

  const value = {
    activeCategory,
    setActiveCategory,
    fetchData,
    convertNumber,
    DEFAULTS,
  };

  return (
    <YoutubeContext.Provider value={value}>{children}</YoutubeContext.Provider>
  );
};

export { YoutubeContextProvider };
