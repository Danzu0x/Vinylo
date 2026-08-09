import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useAudioEngine } from "../hooks/useAudioEngine.js";

const PlayerContext = createContext(null);

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 20; // ~50s cap before giving up on the spotyloader job and falling back

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    async (nextTrack) => {
      const token = ++resolveTokenRef.current;
      setError(null);
      setTrack(nextTrack);

      const cached = resolveCacheRef.current.get(nextTrack.videoId);
      if (cached) {
        setResolveStage("done");
        engine.load(cached, true);
        return;
      }

      const finish = (audioUrl) => {
        if (resolveTokenRef.current !== token) return; // a newer track was selected meanwhile
        resolveCacheRef.current.set(nextTrack.videoId, audioUrl);
        setResolveStage("done");
        engine.load(audioUrl, true);
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
