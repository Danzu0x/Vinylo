import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import { PlaylistProvider } from "./context/PlaylistContext.jsx";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PlaylistProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </PlaylistProvider>
  </React.StrictMode>
);