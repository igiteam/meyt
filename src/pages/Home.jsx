import React, { useEffect, useState } from "react";
import useYoutubeContext from "../hooks/useYoutubeContext";
import Categories from "../components/Categories";
import Videos from "../components/Videos";
import VideosLoader from "../components/VideosLoader";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { FEATURED_CHANNELS } from "../utils/channels";

const Home = () => {
  const { activeCategory, fetchData } = useYoutubeContext();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // In Home.jsx, update the fetchVideos function:

  useEffect(() => {
    window.scrollTo(0, 0);
    setVideos([]);
    setLoading(true);

    const fetchVideos = async () => {
      try {
        if (activeCategory === "New") {
          // Fetch channel videos but limit each channel to 10-20 recent videos
          const channelPromises = FEATURED_CHANNELS.map((channel) =>
            fetchData(channel.handle, "channelVideos", {
              maxResults: 50, // ← Only get 20 most recent per channel
            })
          );

          const results = await Promise.all(channelPromises);

          // Combine all videos and sort by date
          const allVideos = results
            .flatMap((result) => result?.items || [])
            .sort(
              (a, b) =>
                new Date(b.snippet.publishedAt) -
                new Date(a.snippet.publishedAt)
            )
            .slice(0, 100); // ← Optional: limit total to 100 videos

          console.log("✅ Found channel videos:", allVideos.length);
          setVideos(allVideos);
        } else {
          // Regular category search - limit to 48
          const data = await fetchData(activeCategory, "search", {
            maxResults: 48,
          });
          setVideos(data?.items || []);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setLoading(false);
      }
    };

    fetchVideos();
  }, [activeCategory]);

  return (
    <HelmetProvider>
      <div className="flex flex-col md:flex-row p-2 md:p-3 min-h-screen">
        <Helmet>
          <title>
            {activeCategory === "New" ? "Home" : activeCategory} - YouTube
          </title>
        </Helmet>
        <Categories />
        <div className="w-full md:w-4/5">
          {loading ? (
            <VideosLoader />
          ) : videos.length > 0 ? (
            <Videos videos={videos} />
          ) : (
            <div className="text-white text-center py-10">No videos found</div>
          )}
        </div>
      </div>
    </HelmetProvider>
  );
};

export default Home;
