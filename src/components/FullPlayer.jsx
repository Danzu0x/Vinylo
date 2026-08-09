import React, { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { ArtThumb } from "./TrackCard.jsx";
import "../styles/full-player.css";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function splitTitleArtist(track) {
  if (track.artist) return { artist: track.artist, song: track.title };
  const parts = track.title.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), song: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "Tidak diketahui", song: track.title };
}

export function FullPlayer() {
  const {
    track,
    isExpanded,
    collapse,
    isPlaying,
    isBuffering,
    isResolving,
    resolveStage,
    error,
    toggle,
    seek,
    currentTime,
    duration,
    playNext,
    playPrev
  } = usePlayer();

  const trackBarRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("scroll-locked", isExpanded);
    return () => document.body.classList.remove("scroll-locked");
  }, [isExpanded]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isExpanded) collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded, collapse]);

  if (!track) return null;

  const { artist, song } = splitTitleArtist(track);
  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const isLoading = isResolving || isBuffering;
  const stageLabel = {
    spotify: "menyiapkan…",
    fallback: "sumber cadangan…",
    youtube: "sumber terakhir…"
  }[resolveStage];

  const handleScrub = (e) => {
    const bar = trackBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  return (
    <div
      className={`full-player ${isExpanded ? "full-player--open" : ""}`}
      aria-hidden={!isExpanded}
    >
      <div className="full-player__backdrop" onClick={collapse} />
      <div className="full-player__sheet">
        <header className="full-player__header">
          <button className="full-player__close" onClick={collapse} aria-label="Tutup pemutar">
            <ChevronDown />
          </button>
          <span className="full-player__eyebrow">Sedang diputar</span>
          <span />
        </header>

        <div className="full-player__stage">
          <div className={`full-player__disc ${isPlaying ? "full-player__disc--spinning" : ""}`}>
            <ArtThumb src={track.thumbnail} />
            <div className="full-player__disc-hole" />
          </div>
        </div>

        <div className="full-player__info">
          <h1 className="full-player__song">{song}</h1>
          <p className="full-player__artist">{artist}</p>
        </div>

        {error && <p className="full-player__error">{error}</p>}

        <div className="full-player__scrub">
          <div
            className="full-player__bar"
            ref={trackBarRef}
            onClick={handleScrub}
            role="slider"
            aria-label="Posisi lagu"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div className="full-player__bar-fill" style={{ transform: `scaleX(${progress})` }} />
            <div className="full-player__bar-knob" style={{ left: `${progress * 100}%` }} />
          </div>
          <div className="full-player__times">
            <span>{formatTime(currentTime)}</span>
            <span>{isLoading ? stageLabel || "memuat…" : formatTime(duration)}</span>
          </div>
        </div>

        <div className="full-player__controls">
          <button className="full-player__skip" onClick={playPrev} aria-label="Lagu sebelumnya">
            <SkipGlyph flip />
          </button>
          <button
            className="full-player__toggle"
            onClick={toggle}
            aria-label={isPlaying ? "Jeda" : "Putar"}
            disabled={isLoading}
          >
            {isLoading ? <span className="full-player__spinner" /> : isPlaying ? <PauseGlyph /> : <PlayGlyph />}
          </button>
          <button className="full-player__skip" onClick={playNext} aria-label="Lagu berikutnya">
            <SkipGlyph />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 3.4v15.2c0 1.2 1.3 1.9 2.3 1.3l12.2-7.6c1-.6 1-2 0-2.6L8.3 2.1C7.3 1.5 6 2.2 6 3.4z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="5" y="3.5" width="4.4" height="15" rx="1.2" fill="currentColor" />
      <rect x="12.6" y="3.5" width="4.4" height="15" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function SkipGlyph({ flip }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: flip ? "scaleX(-1)" : "none" }}>
      <path d="M4 4.5v11L12 10 4 4.5z" fill="currentColor" />
      <rect x="13.5" y="4.5" width="2" height="11" rx="0.6" fill="currentColor" />
    </svg>
  );
}
