import React, { useState } from "react";
import { HomeSections } from "./components/HomeSections.jsx";
import { MiniPlayer } from "./components/MiniPlayer.jsx";
import { FullPlayer } from "./components/FullPlayer.jsx";
import { SearchOverlay } from "./components/SearchOverlay.jsx";
import { SideNav } from "./components/SideNav.jsx";
import { CreditsPage } from "./components/CreditsPage.jsx";
import { WelcomeModal } from "./components/WelcomeModal.jsx";
import { usePlayer } from "./context/PlayerContext.jsx";
import "./styles/layout.css";

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activePage, setActivePage] = useState(null); // null | "credits"
  const { track } = usePlayer();

  const goHome = () => {
    setIsSearchOpen(false);
    setActivePage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="app-header__brand" onClick={goHome} aria-label="Ke beranda">
          <img className="app-header__logo" src="/logo.svg" alt="Vinylo" />
        </button>
        <div className="app-header__actions">
          <button
            className="app-header__search-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Cari lagu"
          >
            <SearchGlyph />
          </button>
          <button
            className="app-header__search-btn"
            onClick={() => setIsNavOpen(true)}
            aria-label="Buka menu"
          >
            <MenuGlyph />
          </button>
        </div>
      </header>

      <main className={`app-main ${track ? "app-main--with-player" : ""}`}>
        <HomeSections />
      </main>

      <MiniPlayer />
      <FullPlayer />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <SideNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} onNavigate={setActivePage} />
      <CreditsPage isOpen={activePage === "credits"} onClose={() => setActivePage(null)} />
      <WelcomeModal />
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

function MenuGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none">
      <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}