// pages/PlaylistDetails.jsx (you'll need to create this file)
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useYoutubeContext from "../hooks/useYoutubeContext";
import Videos from "../components/Videos";
import VideosLoader from "../components/VideosLoader";
import { Helmet, HelmetProvider } from "react-helmet-async";

const PlaylistDetails = () => {
  const { playlistId } = useParams();
  const { fetchData } = useYoutubeContext();
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    const fetchPlaylistData = async () => {
      try {
        // Fetch playlist details
        const playlistData = await fetchData(playlistId, "playlist");
        setPlaylist(playlistData?.items[0]);

        // Fetch playlist videos
        const videosData = await fetchData(playlistId, "playlistItems");

        // Transform playlist items to match VideoCard format with proper null checking
        const transformedVideos =
          videosData?.items
            ?.map((item) => {
              const snippet = item?.snippet || {};

              // Ensure thumbnails object exists
              if (!snippet.thumbnails) {
                snippet.thumbnails = {
                  medium: {
                    url: "https://via.placeholder.com/320x180?text=No+Thumbnail",
                  },
                };
              }

              return {
                id: { videoId: snippet?.resourceId?.videoId },
                snippet: snippet,
              };
            })
            .filter((video) => video.id.videoId) || []; // Filter out items without videoId

        setVideos(transformedVideos);
      } catch (error) {
        console.error("Error fetching playlist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistData();
  }, [playlistId, fetchData]);

  return (
    <HelmetProvider>
      <div className="text-white p-4">
        <Helmet>
          <title>
            {playlist?.snippet?.title || "Playlist"} - YouTube Clone
          </title>
        </Helmet>

        {playlist && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{playlist.snippet.title}</h1>
            <p className="text-gray-400 mt-2">{playlist.snippet.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              {playlist.contentDetails?.itemCount} videos
            </p>
          </div>
        )}

        {loading ? <VideosLoader /> : <Videos videos={videos} />}
      </div>
    </HelmetProvider>
  );
};

export default PlaylistDetails;
