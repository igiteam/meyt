import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import useYoutubeContext from "../hooks/useYoutubeContext";
import Videos from "../components/Videos";
import VideosLoader from "../components/VideosLoader";
import { Helmet, HelmetProvider } from "react-helmet-async";

const Search = () => {
  const { searchQuery } = useParams();
  const { fetchData } = useYoutubeContext();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Function to fetch search results
  const fetchSearchResults = useCallback(
    async (pageToken = null) => {
      try {
        const data = await fetchData(searchQuery, "search", {
          maxResults: 250,
          pageToken: pageToken,
          getAllResults: false, // Set to true if you want ALL results at once (500)
        });

        return data;
      } catch (error) {
        console.error("Error fetching search results:", error);
        return null;
      }
    },
    [searchQuery, fetchData]
  );

  // Initial load
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setVideos([]);
    setNextPageToken(null);

    fetchSearchResults().then((data) => {
      if (data) {
        setVideos(data.items || []);
        setNextPageToken(data.nextPageToken);
        setTotalResults(data.pageInfo?.totalResults || data.items?.length || 0);
      }
      setLoading(false);
    });
  }, [searchQuery, fetchSearchResults]);

  // Load more function for infinite scroll
  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;

    setLoadingMore(true);
    const data = await fetchSearchResults(nextPageToken);

    if (data && data.items) {
      setVideos((prev) => [...prev, ...data.items]);
      setNextPageToken(data.nextPageToken);
    }
    setLoadingMore(false);
  };

  // Handle scroll for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !nextPageToken) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 1000;

      if (scrollPosition >= threshold) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [nextPageToken, loadingMore]);

  // If you want to fetch ALL results at once (500 max), use this version instead:
  /*
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    
    // Use getAllResults: true to fetch all pages
    fetchData(searchQuery, "search", { 
      getAllResults: true,
      maxResults: 500 
    }).then((data) => {
      setVideos(data?.items || []);
      setLoading(false);
    });
  }, [searchQuery]);
  */

  return (
    <HelmetProvider>
      <div className="py-3">
        <Helmet>
          <title>{`${searchQuery} - Search Results - YouTube`}</title>
          <meta
            name="description"
            content={`Search results for "${searchQuery}" on YouTube`}
          />
        </Helmet>

        {loading ? (
          <VideosLoader />
        ) : (
          <>
            {videos.length > 0 && (
              <div className="px-4 mb-4">
                <h1 className="text-xl font-semibold text-white">
                  Search results for: "{searchQuery}"
                </h1>
                {totalResults > 0 && (
                  <p className="text-sm text-gray-400">
                    About {totalResults} results
                  </p>
                )}
              </div>
            )}

            <Videos videos={videos} />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!nextPageToken && videos.length > 0 && (
              <div className="text-center py-4 text-gray-400">
                No more results
              </div>
            )}

            {videos.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-400">
                No results found for "{searchQuery}"
              </div>
            )}
          </>
        )}
      </div>
    </HelmetProvider>
  );
};

export default Search;
