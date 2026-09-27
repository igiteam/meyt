// components/PlaylistCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaList } from "react-icons/fa";

const PlaylistCard = ({ playlist }) => {
  const {
    id,
    snippet: { title, thumbnails, channelTitle, publishedAt },
    contentDetails: { itemCount },
  } = playlist;

  return (
    <Link to={`/playlist/${id}`}>
      <div className="w-[300px] md:w-[320px] hover:opacity-80 duration-300 cursor-pointer">
        <div className="relative">
          <img
            className="rounded-xl w-full h-[170px] md:h-[210px] object-cover"
            src={thumbnails.medium.url}
            alt={title}
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 px-2 py-1 rounded flex items-center gap-1">
            <FaList className="text-sm" />
            <span className="text-xs">{itemCount}</span>
          </div>
        </div>

        <div className="p-2">
          <h3 className="font-semibold text-sm md:text-base line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{channelTitle}</p>
          <p className="text-xs text-gray-500">
            {new Date(publishedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default PlaylistCard;
