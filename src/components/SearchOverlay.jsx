import React, { useEffect, useRef, useState } from "react";
import { TrackRow } from "./TrackCard.jsx";
import { usePlayer } from "../context/PlayerContext.jsx";
import "../styles/search-overlay.css";

const PAGE_SIZE = 12;

export function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [state, setState] = useState("idle"); // idle | loading | ready | empty | error
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const { track: activeTrack, playTrack } = usePlayer();

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.classList.toggle("scroll-locked", isOpen);
    return () => document.body.classList.remove("scroll-locked");
  }, [isOpen]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setVisibleCount(PAGE_SIZE);
    if (!query.trim()) {
      setState("idle");
      setResults([]);
      return;
    }
    setState("loading");
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status && data.result?.length) {
            setResults(data.result);
            setState("ready");
          } else {
            setResults([]);
            setState("empty");
          }
        })
        .catch(() => setState("error"));
    }, 420);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className={`search-overlay ${isOpen ? "search-overlay--open" : ""}`} aria-hidden={!isOpen}>
      <div className="search-overlay__bar">
        <span className="search-overlay__icon">
          <SearchGlyph />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul lagu atau nama artis…"
          aria-label="Cari lagu"
        />
        <button className="search-overlay__cancel" onClick={onClose}>
          Batal
        </button>
      </div>

      <div className="search-overlay__results">
        {state === "loading" &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

        {state === "empty" && (
          <p className="search-overlay__hint">Tidak ada hasil untuk "{query}". Coba kata kunci lain.</p>
        )}

        {state === "error" && (
          <p className="search-overlay__hint">Pencarian gagal. Coba lagi sebentar.</p>
        )}

        {state === "idle" && (
          <p className="search-overlay__hint">Ketik judul lagu, artis, atau lirik yang kamu ingat.</p>
        )}

        {state === "ready" && (
          <>
            {results.slice(0, visibleCount).map((t) => (
              <TrackRow
                key={t.videoId}
                track={t}
                isActive={activeTrack?.videoId === t.videoId}
                onPlay={(picked) => {
                  playTrack(picked, results);
                  onClose();
                }}
              />
            ))}
            {visibleCount < results.length && (
              <button
                className="search-overlay__load-more"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Muat lebih banyak
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="track-row" style={{ pointerEvents: "none" }}>
      <div className="skeleton" style={{ width: 52, height: 52, borderRadius: "var(--radius-sm)" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="skeleton" style={{ width: "70%", height: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: "40%", height: 10, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
