import React, { useState } from "react";
import { TrackRow } from "./TrackCard.jsx";
import { usePlayer } from "../context/PlayerContext.jsx";
import { usePlaylists } from "../context/PlaylistContext.jsx";
import "../styles/playlist-detail.css";

export function PlaylistDetailPage({ playlistId, isOpen, onClose }) {
  const { playlists, deletePlaylist, removeFromPlaylist } = usePlaylists();
  const { track: activeTrack, playTrack } = usePlayer();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const playlist = playlists.find((p) => p.id === playlistId);

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  const handleDeletePlaylist = () => {
    if (!playlist) return;
    deletePlaylist(playlist.id);
    handleClose();
  };

  return (
    <div className={`playlist-detail ${isOpen ? "playlist-detail--open" : ""}`} aria-hidden={!isOpen}>
      <header className="playlist-detail__header">
        <button className="playlist-detail__back" onClick={handleClose} aria-label="Kembali">
          <ChevronLeft />
        </button>
        <span className="playlist-detail__title">{playlist?.name || "Playlist"}</span>
        <button
          className="playlist-detail__more"
          onClick={() => setConfirmDelete((v) => !v)}
          aria-label="Opsi playlist"
        >
          <MoreGlyph />
        </button>
      </header>

      {confirmDelete && playlist && (
        <div className="playlist-detail__confirm">
          <span>Hapus playlist "{playlist.name}"?</span>
          <div className="playlist-detail__confirm-actions">
            <button onClick={() => setConfirmDelete(false)}>Batal</button>
            <button className="playlist-detail__confirm-danger" onClick={handleDeletePlaylist}>
              Hapus
            </button>
          </div>
        </div>
      )}

      {playlist && (
        <>
          <div className="playlist-detail__summary">
            <p className="playlist-detail__count">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? "lagu" : "lagu"}
            </p>
            {playlist.tracks.length > 0 && (
              <button
                className="playlist-detail__play-all"
                onClick={() => playTrack(playlist.tracks[0], playlist.tracks)}
              >
                <PlayGlyph /> Putar semua
              </button>
            )}
          </div>

          <div className="playlist-detail__list">
            {playlist.tracks.length === 0 ? (
              <p className="playlist-detail__empty">
                Belum ada lagu di playlist ini. Tambahkan dari Music Player lewat tombol "+".
              </p>
            ) : (
              playlist.tracks.map((t) => (
                <div className="playlist-detail__row" key={t.videoId}>
                  <TrackRow
                    track={t}
                    isActive={activeTrack?.videoId === t.videoId}
                    onPlay={(picked) => playTrack(picked, playlist.tracks)}
                  />
                  <button
                    className="playlist-detail__remove"
                    onClick={() => removeFromPlaylist(playlist.id, t.videoId)}
                    aria-label={`Hapus ${t.title} dari playlist`}
                  >
                    <TrashGlyph />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
      <circle cx="9.5" cy="4" r="1.4" fill="currentColor" />
      <circle cx="9.5" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="9.5" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.8v10.4c0 .8.9 1.3 1.5.9l8-5.2c.6-.4.6-1.3 0-1.7l-8-5.2C3.9.5 3 1 3 1.8z" fill="currentColor" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8.2a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
      }
