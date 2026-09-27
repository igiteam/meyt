// pages
import Home from "./pages/Home";
import VideoDetails from "./pages/VideoDetails/VideoDetails";
import ChannelDetails from "./pages/ChannelDetails";
import Search from "./pages/Search";
import Error from "./pages/Error";
import PlaylistDetails from "./pages/PlaylistDetails";
// components
import Navbar from "./components/Navbar";

// context provider
import { YoutubeContextProvider } from "./contexts/YoutubeContext";

// react router dom
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <YoutubeContextProvider>
      <div className="bg-cBlack min-h-screen">
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route path="/video/:videoId" element={<VideoDetails />} />
            <Route path="/channel/:channelId" element={<ChannelDetails />} />
            <Route path="/search/:searchQuery" element={<Search />} />
            <Route path="/playlist/:playlistId" element={<PlaylistDetails />} />
            <Route path="*" element={<Error />} />
          </Routes>
        </BrowserRouter>
      </div>
    </YoutubeContextProvider>
  );
}

export default App;
