import React, { useState } from "react";
import { usePlaylists } from "../context/PlaylistContext.jsx";
import "../styles/add-to-playlist.css";

export function AddToPlaylistSheet({ track, isOpen, onClose }) {
  const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, isTrackInPlaylist } = usePlaylists();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  if (!isOpen || !track) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    const id = createPlaylist(newName);
    if (id) addToPlaylist(id, track);
    setNewName("");
    setIsCreating(false);
  };

  const handleToggle = (playlistId) => {
    if (isTrackInPlaylist(playlistId, track.videoId)) {
      removeFromPlaylist(playlistId, track.videoId);
    } else {
      addToPlaylist(playlistId, track);
    }
  };

  return (
    <div className="add-playlist-sheet">
      <div className="add-playlist-sheet__backdrop" onClick={onClose} />
      <div className="add-playlist-sheet__panel">
        <header className="add-playlist-sheet__header">
          <span className="add-playlist-sheet__title">Tambah ke Playlist</span>
          <button className="add-playlist-sheet__close" onClick={onClose} aria-label="Tutup">
            <CloseGlyph />
          </button>
        </header>

        <div className="add-playlist-sheet__list">
          {playlists.length === 0 && !isCreating && (
            <p className="add-playlist-sheet__hint">Belum ada playlist. Buat satu dulu, yuk.</p>
          )}

          {playlists.map((p) => {
            const inPlaylist = isTrackInPlaylist(p.id, track.videoId);
            return (
              <button
                key={p.id}
                className={`add-playlist-sheet__item ${inPlaylist ? "add-playlist-sheet__item--active" : ""}`}
                onClick={() => handleToggle(p.id)}
              >
                <span className="add-playlist-sheet__item-name">{p.name}</span>
                <span className="add-playlist-sheet__item-count">{p.tracks.length} lagu</span>
                <span className="add-playlist-sheet__item-check" aria-hidden="true">
                  {inPlaylist ? <CheckGlyph /> : <PlusGlyph />}
                </span>
              </button>
            );
          })}
        </div>

        {isCreating ? (
          <form className="add-playlist-sheet__create-form" onSubmit={handleCreate}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama playlist baru"
              aria-label="Nama playlist baru"
            />
            <div className="add-playlist-sheet__create-actions">
              <button type="button" onClick={() => setIsCreating(false)}>
                Batal
              </button>
              <button type="submit" disabled={!newName.trim()}>
                Buat & tambahkan
              </button>
            </div>
          </form>
        ) : (
          <button className="add-playlist-sheet__new-btn" onClick={() => setIsCreating(true)}>
            <PlusGlyph /> Buat playlist baru
          </button>
        )}
      </div>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2.5 8l3.2 3.2L12.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}