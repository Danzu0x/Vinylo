import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useAudioEngine } from "../hooks/useAudioEngine.js";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [track, setTrack] = useState(null); // currently loaded track object
  const [queue, setQueue] = useState([]); // list this track was played from
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false); // full player open?
  const [isResolving, setIsResolving] = useState(false); // fetching audio url
  const [error, setError] = useState(null);

  const resolveCacheRef = useRef(new Map()); // videoId -> audioUrl

  const handleEnded = useCallback(() => {
    playNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, queueIndex]);

  const engine = useAudioEngine({ onEnded: handleEnded });

  const resolveAndLoad = useCallback(async (nextTrack) => {
    setError(null);
    setTrack(nextTrack);

    const cached = resolveCacheRef.current.get(nextTrack.videoId);
    if (cached) {
      engine.load(cached, true);
      return;
    }

    setIsResolving(true);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(nextTrack.url)}`);
      const data = await res.json();
      if (!data.status || !data.audioUrl) {
        throw new Error(data.message || "Tidak bisa memuat audio.");
      }
      resolveCacheRef.current.set(nextTrack.videoId, data.audioUrl);
      engine.load(data.audioUrl, true);
    } catch (err) {
      setError(err.message || "Gagal memuat lagu ini. Coba lagu lain.");
    } finally {
      setIsResolving(false);
    }
  }, [engine]);

  const playTrack = useCallback((selectedTrack, list = []) => {
    const sourceQueue = list.length ? list : [selectedTrack];
    const idx = sourceQueue.findIndex((t) => t.videoId === selectedTrack.videoId);
    setQueue(sourceQueue);
    setQueueIndex(idx === -1 ? 0 : idx);
    resolveAndLoad(selectedTrack);
  }, [resolveAndLoad]);

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

  const value = useMemo(() => ({
    track,
    queue,
    queueIndex,
    isExpanded,
    isResolving,
    error,
    ...engine,
    playTrack,
    playNext,
    playPrev,
    expand,
    collapse
  }), [track, queue, queueIndex, isExpanded, isResolving, error, engine, playTrack, playNext, playPrev, expand, collapse]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
