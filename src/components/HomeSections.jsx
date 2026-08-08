import React, { useEffect, useRef, useState } from "react";
import { TrackCard } from "./TrackCard.jsx";
import { usePlayer } from "../context/PlayerContext.jsx";
import "../styles/home.css";

// Curated starting points so the home page never feels empty. Each section
// is just a search query under the hood — swap or add rows here freely.
const SECTIONS = [
  { title: "Populer di Indonesia, 2025", query: "lagu pop indonesia terpopuler 2025" },
  { title: "Lofi buat nemenin kerja", query: "lofi chill mix 2022" },
  { title: "Lewis Capaldi", query: "Lewis Capaldi" },
  { title: "Alan Walker", query: "Alan Walker" },
  { title: "Rex Orange County", query: "Rex Orange County" }
];

function SectionRow({ title, query }) {
  const [tracks, setTracks] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const { track: activeTrack, playTrack } = usePlayer();
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    let cancelled = false;
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status && data.result?.length) {
          setTracks(data.result.slice(0, 10));
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (state === "error") return null;

  return (
    <section className="home-section">
      <h2 className="home-section__title">{title}</h2>
      <div className="home-section__row hscroll">
        {state === "loading"
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : tracks.map((t) => (
              <TrackCard
                key={t.videoId}
                track={t}
                isActive={activeTrack?.videoId === t.videoId}
                onPlay={(picked) => playTrack(picked, tracks)}
              />
            ))}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="track-card">
      <div className="skeleton" style={{ width: 148, height: 148, borderRadius: "var(--radius-md)" }} />
      <div className="skeleton" style={{ width: "90%", height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: "60%", height: 10, borderRadius: 4 }} />
    </div>
  );
}

export function HomeSections() {
  return (
    <div className="home-sections">
      {SECTIONS.map((s) => (
        <SectionRow key={s.title} title={s.title} query={s.query} />
      ))}
    </div>
  );
}
