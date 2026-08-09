import React, { useEffect, useState } from "react";
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
  { title: "Rex Orange County", query: "Rex Orange County" },
  { title: "Tulus & musik Indonesia", query: "Tulus" },
  { title: "The Weeknd", query: "The Weeknd" },
  { title: "Bruno Mars", query: "Bruno Mars" },
  { title: "NIKI", query: "NIKI" },
  { title: "Dangdut & koplo hits", query: "dangdut koplo terbaru 2025" },
  { title: "Hip-hop internasional", query: "hip hop hits 2025" },
  { title: "Malam santai, akustik", query: "akustik cover santai" }
];

// Fisher–Yates so home doesn't show tracks in the exact same order every
// visit — combined with taking more results than we display, this makes
// the same underlying search query feel fresher on reload.
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function SectionRow({ title, query }) {
  const [tracks, setTracks] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const { track: activeTrack, playTrack } = usePlayer();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status && data.result?.length) {
          setTracks(shuffle(data.result).slice(0, 12));
          setState("ready");
        } else {
          setErrorMessage(data.message || "Tidak ada hasil.");
          setState("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Koneksi ke server gagal.");
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, attempt]);

  if (state === "error") {
    return (
      <section className="home-section">
        <h2 className="home-section__title">{title}</h2>
        <div className="home-section__error">
          <p>{errorMessage}</p>
          <button onClick={() => setAttempt((n) => n + 1)}>Coba lagi</button>
        </div>
      </section>
    );
  }

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
