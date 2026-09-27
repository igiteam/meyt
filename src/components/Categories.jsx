import React from "react";
import { categories } from "../utils/constants";
import ChannelSidebar from "./ChannelSidebar";
import PlaylistSidebar from "./PlaylistSidebar";
import useYoutubeContext from "../hooks/useYoutubeContext";

const Categories = () => {
  const { activeCategory, setActiveCategory } = useYoutubeContext();

  return (
    <div className="w-full md:w-1/5 md:h-[85vh] md:overflow-y-auto md:border-r-2 border-cGray sticky left-0 bg-cBlack scrollbar-hide">
      {/* Categories Section */}
      <div className="flex flex-row md:flex-col overflow-x-scroll md:overflow-x-visible whitespace-nowrap md:whitespace-normal scroll-smooth scrollbar-hide py-2 md:py-3 px-2 md:px-3">
        {categories.map((category, index) => (
          <div
            key={index}
            className={`inline-block md:block px-3 py-2 md:px-4 md:py-3 mr-2 md:mr-0 mb-0 md:mb-2 cursor-pointer bg-cGray md:hover:bg-cGray duration-300 rounded-lg font-bold ${
              category.name === activeCategory
                ? "bg-white text-cGray md:text-white md:bg-cGray"
                : "text-white md:bg-transparent"
            }`}
            onClick={() => setActiveCategory(category.name)}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-lg md:text-xl flex-shrink-0">
                {category.icon}
              </span>
              <span className="text-sm md:text-base truncate">
                {category.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Followed Sections - Controlled spacing */}
      <div className="flex flex-col">
        <ChannelSidebar />
        <PlaylistSidebar />
      </div>
    </div>
  );
};

export default Categories;
