import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const PlaylistContext = createContext(null);

const STORAGE_KEY = "vinylo:playlists";

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {
  }
}

function makeId() {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState(() => loadPlaylists());

  useEffect(() => {
    savePlaylists(playlists);
  }, [playlists]);

  const createPlaylist = useCallback((name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const newPlaylist = { id: makeId(), name: trimmed, tracks: [], createdAt: Date.now() };
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newPlaylist.id;
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const renamePlaylist = useCallback((playlistId, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name: trimmed } : p)));
  }, []);

  const addToPlaylist = useCallback((playlistId, track) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some((t) => t.videoId === track.videoId)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      })
    );
  }, []);

  const removeFromPlaylist = useCallback((playlistId, videoId) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.videoId !== videoId) } : p))
    );
  }, []);

  const isTrackInPlaylist = useCallback(
    (playlistId, videoId) => {
      const p = playlists.find((pl) => pl.id === playlistId);
      return !!p?.tracks.some((t) => t.videoId === videoId);
    },
    [playlists]
  );

  const value = useMemo(
    () => ({
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      isTrackInPlaylist
    }),
    [playlists, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist, isTrackInPlaylist]
  );

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylists() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylists must be used within PlaylistProvider");
  return ctx;
}
