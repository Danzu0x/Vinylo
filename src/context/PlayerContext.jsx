import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAudioEngine } from "../hooks/useAudioEngine.js";

const PlayerContext = createContext(null);

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 20; // ~50s cap before giving up on the spotyloader job and falling back
const STORAGE_KEY = "vinylo:playback";
const PERSIST_INTERVAL_S = 5; // don't write to localStorage more than every ~5s of playback

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadSavedPlayback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.track?.url || !parsed?.track?.videoId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePlayback(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full / disabled — resuming just won't work, not fatal
  }
}

export function PlayerProvider({ children }) {
  const [track, setTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolveStage, setResolveStage] = useState("idle"); // idle | spotify | fallback | youtube | done
  const [error, setError] = useState(null);

  const resolveCacheRef = useRef(new Map()); // videoId -> audioUrl
  const resolveTokenRef = useRef(0); // guards against stale async results after track changes

  const handleEnded = useCallback(() => {
    playNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, queueIndex]);

  const engine = useAudioEngine({ onEnded: handleEnded });

  // ---- individual source attempts ----

  const trySpotify = useCallback(async (spotifyTrack, token) => {
    const startRes = await fetch("/api/spotify-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: spotifyTrack.url })
    });
    const startData = await startRes.json();
    if (!startData.status || !startData.jobId) return null;

    for (let i = 0; i < MAX_POLLS; i++) {
      if (resolveTokenRef.current !== token) return "cancelled";
      await wait(POLL_INTERVAL_MS);
      const statusRes = await fetch(`/api/spotify-status?jobId=${encodeURIComponent(startData.jobId)}`);
      const statusData = await statusRes.json();
      if (statusData.state === "ready" && statusData.audioUrl) return statusData.audioUrl;
      if (statusData.state === "error") return null;
      // otherwise still pending, keep polling
    }
    return null;
  }, []);

  const tryFallback = useCallback(async (spotifyTrack) => {
    const res = await fetch(`/api/spotify-fallback?url=${encodeURIComponent(spotifyTrack.url)}`);
    const data = await res.json();
    return data.status && data.audioUrl ? data.audioUrl : null;
  }, []);

  const tryYoutubeLastResort = useCallback(async (spotifyTrack) => {
    const q = spotifyTrack.artist ? `${spotifyTrack.artist} ${spotifyTrack.title}` : spotifyTrack.title;
    const searchRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
    const searchData = await searchRes.json();
    const top = searchData?.result?.[0];
    if (!top?.url) return null;

    const dlRes = await fetch(`/api/youtube-download?url=${encodeURIComponent(top.url)}`);
    const dlData = await dlRes.json();
    return dlData.status && dlData.audioUrl ? dlData.audioUrl : null;
  }, []);

  // ---- orchestration ----

  const resolveAndLoad = useCallback(
    async (nextTrack, { autoplay = true, seekTo = 0 } = {}) => {
      const token = ++resolveTokenRef.current;
      setError(null);
      setTrack(nextTrack);

      const cached = resolveCacheRef.current.get(nextTrack.videoId);
      if (cached) {
        setResolveStage("done");
        engine.load(cached, autoplay, seekTo);
        return;
      }

      const finish = (audioUrl) => {
        if (resolveTokenRef.current !== token) return; // a newer track was selected meanwhile
        resolveCacheRef.current.set(nextTrack.videoId, audioUrl);
        setResolveStage("done");
        engine.load(audioUrl, autoplay, seekTo);
      };

      try {
        setResolveStage("spotify");
        const spotifyResult = await trySpotify(nextTrack, token);
        if (resolveTokenRef.current !== token) return;
        if (spotifyResult && spotifyResult !== "cancelled") {
          finish(spotifyResult);
          return;
        }

        setResolveStage("fallback");
        const fallbackResult = await tryFallback(nextTrack);
        if (resolveTokenRef.current !== token) return;
        if (fallbackResult) {
          finish(fallbackResult);
          return;
        }

        setResolveStage("youtube");
        const youtubeResult = await tryYoutubeLastResort(nextTrack);
        if (resolveTokenRef.current !== token) return;
        if (youtubeResult) {
          finish(youtubeResult);
          return;
        }

        setResolveStage("idle");
        setError("Semua sumber gagal memuat lagu ini. Coba lagu lain.");
      } catch (err) {
        if (resolveTokenRef.current !== token) return;
        setResolveStage("idle");
        setError("Terjadi kesalahan saat memuat lagu ini.");
      }
    },
    [engine, trySpotify, tryFallback, tryYoutubeLastResort]
  );

  const playTrack = useCallback(
    (selectedTrack, list = []) => {
      const sourceQueue = list.length ? list : [selectedTrack];
      const idx = sourceQueue.findIndex((t) => t.videoId === selectedTrack.videoId);
      setQueue(sourceQueue);
      setQueueIndex(idx === -1 ? 0 : idx);
      resolveAndLoad(selectedTrack);
    },
    [resolveAndLoad]
  );

  const playNext = useCallback(() => {
    setQueue((currentQueue) => {
      setQueueIndex((currentIndex) => {
        if (!currentQueue.length) return currentIndex;
        const nextIndex = (currentIndex + 1) % currentQueue.length;
        resolveAndLoad(currentQueue[nextIndex]);
        return nextIndex;
      });
      return currentQueue;
    });
  }, [resolveAndLoad]);

  const playPrev = useCallback(() => {
    setQueue((currentQueue) => {
      setQueueIndex((currentIndex) => {
        if (!currentQueue.length) return currentIndex;
        const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
        resolveAndLoad(currentQueue[prevIndex]);
        return prevIndex;
      });
      return currentQueue;
    });
  }, [resolveAndLoad]);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  // ---- resume playback after a refresh ----

  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const saved = loadSavedPlayback();
    if (!saved) return;
    setQueue(saved.queue?.length ? saved.queue : [saved.track]);
    setQueueIndex(typeof saved.queueIndex === "number" ? saved.queueIndex : 0);
    // autoplay:false — browsers block unsolicited audio after a refresh anyway,
    // and it's more polite to let the person tap play themselves. The saved
    // position is still restored so pressing play picks up right where they left off.
    resolveAndLoad(saved.track, { autoplay: false, seekTo: saved.currentTime || 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPersistedTimeRef = useRef(0);
  useEffect(() => {
    if (!track) return;
    if (Math.abs(engine.currentTime - lastPersistedTimeRef.current) < PERSIST_INTERVAL_S) return;
    lastPersistedTimeRef.current = engine.currentTime;
    savePlayback({ track, queue, queueIndex, currentTime: engine.currentTime });
  }, [engine.currentTime, track, queue, queueIndex]);

  useEffect(() => {
    const persistNow = () => {
      if (!track) return;
      savePlayback({ track, queue, queueIndex, currentTime: engine.currentTime });
    };
    window.addEventListener("pagehide", persistNow);
    window.addEventListener("beforeunload", persistNow);
    return () => {
      window.removeEventListener("pagehide", persistNow);
      window.removeEventListener("beforeunload", persistNow);
    };
  }, [track, queue, queueIndex, engine.currentTime]);

  const isResolving = resolveStage !== "idle" && resolveStage !== "done";

  const value = useMemo(
    () => ({
      track,
      queue,
      queueIndex,
      isExpanded,
      isResolving,
      resolveStage,
      error,
      ...engine,
      playTrack,
      playNext,
      playPrev,
      expand,
      collapse
    }),
    [track, queue, queueIndex, isExpanded, isResolving, resolveStage, error, engine, playTrack, playNext, playPrev, expand, collapse]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
