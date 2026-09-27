import React from "react";
import { Link } from "react-router-dom";
import { FEATURED_CHANNELS } from "../utils/channels";
import { FaUserCircle } from "react-icons/fa";

const ChannelSidebar = () => {
  return (
    <div className="px-2 md:px-3">
      <div className="flex flex-row md:flex-col gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible py-1 md:py-2 scrollbar-hide">
        {FEATURED_CHANNELS.map((channel, index) => (
          <Link
            key={index}
            to={`/channel/${channel.handle}`}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-cGray rounded-lg hover:bg-gray-700 transition-colors min-w-[120px] md:min-w-0"
          >
            <FaUserCircle className="text-base md:text-xl text-gray-400 flex-shrink-0" />
            <span className="text-white text-xs md:text-sm truncate">
              {channel.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChannelSidebar;
