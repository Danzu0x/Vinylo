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

export function ArtThumb({ src, alt = "" }) {
  const [failed, setFailed] = React.useState(false);
  const showPlaceholder = !src || failed;

  if (showPlaceholder) {
    return (
      <div className="art-thumb__placeholder" aria-hidden="true">
        <NoteGlyph />
      </div>
    );
  }

  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function NoteGlyph() {
  return (
    <svg width="28%" height="28%" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
        <ArtThumb src={track.thumbnail} />
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
        <ArtThumb src={track.thumbnail} />
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
