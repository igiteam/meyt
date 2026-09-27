import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useYoutubeContext from "../hooks/useYoutubeContext";
// components
import Videos from "../components/Videos";
import VideosLoader from "../components/VideosLoader";
// skeleton
import Skeleton from "react-loading-skeleton";
// react-helmet
import { Helmet, HelmetProvider } from "react-helmet-async";

const ChannelDetails = () => {
  const { channelId } = useParams();
  const { fetchData, convertNumber } = useYoutubeContext();
  const [channelDetail, setChannelDetail] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // In the useEffect, update the fetchData calls:

  // In pages/ChannelDetails.jsx, update the useEffect:

  useEffect(() => {
    window.scrollTo(0, 0);

    // If channelId contains @, fetch by handle, otherwise use as ID
    const fetchChannelData = async () => {
      setLoading(true);

      // Fetch channel details (fetchData handles @ automatically)
      const channelData = await fetchData(channelId, "channels");
      setChannelDetail(channelData?.items[0]);

      // Get the actual channel ID for fetching videos
      let actualChannelId = channelId;
      if (channelId.includes("@")) {
        // We need to resolve it first - fetchData will do this internally
        // But for videos, we need the resolved ID
        const resolvedData = await fetchData(channelId, "channels");
        actualChannelId = resolvedData?.items[0]?.id;
      }

      // Fetch channel videos
      const videosData = await fetchData(
        actualChannelId || channelId,
        "channelVideos"
      );
      setVideos(videosData?.items || []);
      setLoading(false);
    };

    fetchChannelData();
  }, [channelId]);
  // const {
  //   brandingSettings: { image },
  //   snippet: { title, customUrl, thumbnails },
  //   statistics: { subscriberCount, videoCount },
  // } = channelDetail;

  return (
    <HelmetProvider>
      <div className="text-white">
        <Helmet>
          <title>{`${channelDetail?.snippet?.title} - YouTube`}</title>
        </Helmet>

        <div className="flex flex-col md:flex-row items-center py-3 px-2 sm:px-6 md:px-12 lg:px-20">
          {channelDetail?.snippet?.thumbnails?.default?.url ? (
            <img
              src={channelDetail?.snippet?.thumbnails?.default?.url}
              alt={channelDetail?.snippet?.title}
              className="rounded-full h-[100px] w-[100px] md:w-[128px] md:h-[128px]"
            />
          ) : (
            <Skeleton className="rounded-full h-[100px] w-[100px] md:w-[128px] md:h-[128px]" />
          )}

          <div className="flex flex-col items-center md:items-start p-3">
            <h1 className="font-bold text-xl md:text-2xl py-2 md:py-1">
              {channelDetail?.snippet?.title || (
                <Skeleton className="w-[200px]" />
              )}
            </h1>

            <div className="flex text-gray-300 space-x-2 sm:space-x-3 md:space-x-4 text-[11px] sm:text-[13px] md:text-[16px]">
              <p>
                {channelDetail?.snippet?.customUrl || (
                  <Skeleton className="w-[70px]" />
                )}
              </p>
              <p>
                {convertNumber(
                  parseInt(channelDetail?.statistics?.subscriberCount || 0)
                )}{" "}
                subscribers
              </p>
              <p>
                {convertNumber(channelDetail?.statistics?.videoCount) || 0}{" "}
                videos
              </p>
            </div>
          </div>
        </div>
        <hr className="my-5" />
        {loading ? <VideosLoader /> : <Videos videos={videos} />}
      </div>
    </HelmetProvider>
  );
};

export default ChannelDetails;
