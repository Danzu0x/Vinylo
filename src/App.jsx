import React, { useState } from "react";
import { HomeSections } from "./components/HomeSections.jsx";
import { MiniPlayer } from "./components/MiniPlayer.jsx";
import { FullPlayer } from "./components/FullPlayer.jsx";
import { SearchOverlay } from "./components/SearchOverlay.jsx";
import { usePlayer } from "./context/PlayerContext.jsx";
import "./styles/layout.css";

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { track } = usePlayer();

  const goHome = () => {
    setIsSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="app-header__brand" onClick={goHome} aria-label="Ke beranda">
          <img className="app-header__logo" src="/logo.svg" alt="Vinylo" />
        </button>
        <button
          className="app-header__search-btn"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Cari lagu"
        >
          <SearchGlyph />
        </button>
      </header>

      <main className={`app-main ${track ? "app-main--with-player" : ""}`}>
        <HomeSections />
      </main>

      <MiniPlayer />
      <FullPlayer />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
