import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AiOutlineSearch } from "react-icons/ai";

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const params = useParams();
  const isUserTyping = useRef(false);
  const initialLoadDone = useRef(false);

  // Update search input when URL param changes, but only if user isn't typing
  useEffect(() => {
    // Try to get the search term from URL
    let foundTerm = null;

    // Check for query param first (most common)
    if (params.query) {
      foundTerm = params.query;
    }
    // Check for search param
    else if (params.search) {
      foundTerm = params.search;
    }
    // Check for q param
    else if (params.q) {
      foundTerm = params.q;
    }
    // Check for searchTerm param
    else if (params.searchTerm) {
      foundTerm = params.searchTerm;
    }
    // Check for indexed params (if using catch-all route)
    else if (params[0]) {
      foundTerm = params[0];
    }
    // Manually extract from pathname as fallback
    else if (window.location.pathname.includes("/search/")) {
      const pathParts = window.location.pathname.split("/search/");
      if (pathParts.length > 1 && pathParts[1]) {
        foundTerm = pathParts[1];
      }
    }

    if (foundTerm) {
      try {
        const decodedTerm = decodeURIComponent(foundTerm);
        // Only update if user ISN'T currently typing
        if (!isUserTyping.current) {
          setSearch(decodedTerm);
        }
      } catch (e) {
        if (!isUserTyping.current) {
          setSearch(foundTerm);
        }
      }
    } else {
      // Clear search if not on search page AND user isn't typing
      if (
        !window.location.pathname.includes("/search/") &&
        !isUserTyping.current
      ) {
        setSearch("");
      }
    }

    // Mark initial load as done
    initialLoadDone.current = true;
  }, [params]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      const encodedSearch = encodeURIComponent(search.trim());
      navigate(`/search/${encodedSearch}`);
      // Reset typing flag after navigation
      isUserTyping.current = false;
    }
  };

  const handleInputChange = (e) => {
    // Mark that user is typing
    isUserTyping.current = true;
    setSearch(e.target.value);
  };

  const handleInputBlur = () => {
    // User stopped typing, reset flag after a delay
    setTimeout(() => {
      isUserTyping.current = false;
    }, 200);
  };

  const handleKeyDown = (e) => {
    // If user presses Escape, clear the search
    if (e.key === "Escape") {
      setSearch("");
      isUserTyping.current = false;
    }
  };

  return (
    <form
      className="flex items-center bg-cGray rounded-full w-full h-7 sm:h-8 md:h-10"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        placeholder="Search"
        className="px-2 py-0 h-full w-full outline-none focus:outline-blue-800 text-white bg-transparent rounded-l-full text-xs sm:text-sm md:text-base min-w-0"
        value={search}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="h-full px-2 md:px-3 flex items-center justify-center text-sm md:text-base cursor-pointer hover:bg-gray-700 rounded-r-full transition-colors flex-shrink-0"
        aria-label="Search"
      >
        <AiOutlineSearch
          color="#fff"
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5"
        />
      </button>
    </form>
  );
};

export default SearchBar;
