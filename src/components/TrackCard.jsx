import React from "react";
import "../styles/track-card.css";

function splitTitleArtist(track) {
  // Spotify results already come with a clean, separate artist field. Older
  // sources (the YouTube last-resort fallback) only give a combined
  // "Artist - Song" title, so guess from that when artist isn't present.
  if (track.artist) return { artist: track.artist, song: track.title };
  const parts = track.title.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), song: parts.slice(1).join(" - ").trim() };
  }
  return { artist: null, song: track.title };
}

export function TrackCard({ track, onPlay, isActive }) {
  const { artist, song } = splitTitleArtist(track);

  return (
    <button
      className={`track-card ${isActive ? "track-card--active" : ""}`}
      onClick={() => onPlay(track)}
      aria-label={`Putar ${track.title}`}
    >
      <div className="track-card__art">
        <img src={track.thumbnail} alt="" loading="lazy" />
        {track.duration && <span className="track-card__duration">{track.duration}</span>}
        <span className="track-card__play-badge" aria-hidden="true">
          <PlayGlyph />
        </span>
      </div>
      <div className="track-card__meta">
        <p className="track-card__song">{song}</p>
        {artist && <p className="track-card__artist">{artist}</p>}
      </div>
    </button>
  );
}

export function TrackRow({ track, onPlay, isActive }) {
  const { artist, song } = splitTitleArtist(track);

  return (
    <button
      className={`track-row ${isActive ? "track-row--active" : ""}`}
      onClick={() => onPlay(track)}
      aria-label={`Putar ${track.title}`}
    >
      <div className="track-row__art">
        <img src={track.thumbnail} alt="" loading="lazy" />
      </div>
      <div className="track-row__meta">
        <p className="track-row__song">{song}</p>
        <p className="track-row__sub">
          {artist ? `${artist}` : ""}
          {artist && track.duration ? " · " : ""}
          {track.duration || ""}
        </p>
      </div>
      <span className="track-row__glyph" aria-hidden="true">
        <PlayGlyph />
      </span>
    </button>
  );
}

function PlayGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.8v10.4c0 .8.9 1.3 1.5.9l8-5.2c.6-.4.6-1.3 0-1.7l-8-5.2C3.9.5 3 1 3 1.8z" fill="currentColor" />
    </svg>
  );
}
