import React from "react";
import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-1 sm:px-3 md:px-8 py-2 md:py-3 sticky w-full top-0 z-10 bg-cBlack shadow-md overflow-hidden">
      {/* Left logo - visible */}
      <Link to="/" className="flex-shrink-0">
        <div className="flex text-2xl sm:text-3xl md:text-5xl cursor-pointer">
          <img
            src="https://cdn.sdappnet.cloud/rtx/images/youtube-icon.png"
            style={{ height: "28px", width: "auto" }}
            alt="YouTube Logo"
            className="sm:h-[32px] md:h-[36px]"
          />
        </div>
      </Link>

      {/* Searchbar - centered and fills most of the space on mobile */}
      <div className="flex-1 flex justify-center px-0.5 sm:px-2">
        <div className="w-full max-w-[90%] xs:max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] xl:max-w-[40%]">
          <SearchBar />
        </div>
      </div>

      {/* Right logo - external link with border radius */}
      <a
        href="https://macosxjs.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 block transition-transform hover:scale-105 active:scale-95"
      >
        <div className="flex text-2xl sm:text-3xl md:text-5xl cursor-pointer overflow-hidden rounded-lg">
          <img
            src="https://cdn.sdappnet.cloud/rtx/images/macosxjs.png"
            style={{ height: "28px", width: "auto" }}
            alt="macOSX JS"
            title="Visit macOSX JS"
            className="sm:h-[32px] md:h-[36px]"
          />
        </div>
      </a>
    </nav>
  );
};

export default Navbar;
