import React from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import "../styles/mini-player.css";

export function MiniPlayer() {
  const { track, isPlaying, isBuffering, isResolving, resolveStage, toggle, expand, currentTime, duration } = usePlayer();

  if (!track) return null;

  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const stageLabel = {
    spotify: "Menyiapkan lagu…",
    fallback: "Mencoba sumber cadangan…",
    youtube: "Mencoba sumber terakhir…"
  }[resolveStage];

  return (
    <div className="mini-player" role="button" tabIndex={0} onClick={expand}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && expand()}
      aria-label="Buka pemutar penuh">
      <div className="mini-player__progress" style={{ transform: `scaleX(${progress})` }} />
      <div className="mini-player__art">
        <img src={track.thumbnail} alt="" />
      </div>
      <div className="mini-player__meta">
        <p className="mini-player__title">{track.title}</p>
        <p className="mini-player__sub">
          {isResolving ? stageLabel : isBuffering ? "Memuat…" : track.duration || track.artist || ""}
        </p>
      </div>
      <button
        className="mini-player__toggle"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-label={isPlaying ? "Jeda" : "Putar"}
      >
        {isResolving ? <SpinnerGlyph /> : isPlaying ? <PauseGlyph /> : <PlayGlyph />}
      </button>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 2.2v11.6c0 .9 1 1.4 1.7 1l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.7 0-1.7 1z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="2.5" width="3.2" height="11" rx="1" fill="currentColor" />
      <rect x="9.3" y="2.5" width="3.2" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

function SpinnerGlyph() {
  return <span className="mini-player__spinner" aria-hidden="true" />;
}
