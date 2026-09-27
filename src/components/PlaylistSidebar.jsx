import React from "react";
import { Link } from "react-router-dom";
import { FEATURED_PLAYLISTS } from "../utils/playlists";
import { FaList } from "react-icons/fa";

const PlaylistSidebar = () => {
  return (
    <div className="px-2 md:px-3">
      <div className="flex flex-row md:flex-col gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible py-1 md:py-2 scrollbar-hide">
        {FEATURED_PLAYLISTS.map((playlist, index) => (
          <Link
            key={index}
            to={`/playlist/${playlist.id}`}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-cGray rounded-lg hover:bg-gray-700 transition-colors min-w-[120px] md:min-w-0"
          >
            <FaList className="text-xs md:text-sm text-gray-400 flex-shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-white text-xs md:text-sm truncate">
                {playlist.name}
              </span>
              <span className="text-gray-500 text-[10px] md:text-xs truncate">
                {playlist.channel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PlaylistSidebar;
