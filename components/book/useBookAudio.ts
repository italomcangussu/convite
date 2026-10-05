"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { clampVolume, downloadAudio, fadeIn, resolveStartAt } from "@/lib/audio";
import type { AudioLoad } from "@/lib/loading";

/**
 * After this long the book stops waiting and streams the track instead.
 * Keep it below the cover's own "slow" bypass (14 s in Book.tsx) so the track
 * always settles (in memory or streaming) before the book can be opened.
 */
const GATE_MS = 12_000;
/** A connection that goes quiet this long is treated as stalled. */
const STALL_MS = 6_000;

type Options = {
  /** Public URL of the soundtrack; undefined when none is configured. */
  url?: string;
  path: string;
  volume: unknown;
  startAt: unknown;
};

type Load = {
  /** The URL this state belongs to; a stale state reads as "loading". */
  forUrl?: string;
  status: Exclude<AudioLoad, "none">;
  progress: number;
  src?: string;
};

/**
 * Owns the soundtrack. It is downloaded as soon as the page loads so that the
 * tap on "Abrir o livro" can call `play()` on data that is already in memory:
 * the music then starts together with the cover instead of after a round trip.
 * `play()` itself must still run synchronously inside that tap (iOS rule).
 */
export function useBookAudio({ url, path, volume, startAt }: Options) {
  const ref = useRef<HTMLAudioElement>(null);
  const [stored, setStored] = useState<Load | null>(null);
  const load: Load =
    stored && stored.forUrl === url ? stored : { status: "loading", progress: 0 };
  const [playing, setPlaying] = useState(false);
  // True once the music has actually begun at least once.
  const [started, setStarted] = useState(false);
  // The browser refused play(); the player button shows how to start it.
  const [blocked, setBlocked] = useState(false);
  const stopFade = useRef<() => void>(() => {});
  const resumeWhenVisible = useRef(false);
  const fromBlob = useRef(false);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let cancelled = false;
    let lastPercent = -1;

    const giveUp = setTimeout(() => controller.abort(), GATE_MS);
    downloadAudio(url, path, {
      signal: controller.signal,
      stallMs: STALL_MS,
      onProgress: (loaded, total) => {
        // Unknown size: approach 100% asymptotically instead of freezing.
        const ratio = total ? loaded / total : loaded / (loaded + 2_000_000);
        const percent = Math.floor(ratio * 100);
        if (cancelled || percent === lastPercent) return;
        lastPercent = percent;
        setStored((current) => ({
          ...(current?.forUrl === url ? current : { status: "loading" as const }),
          forUrl: url,
          progress: percent / 100,
        }));
      },
    })
      .then((blob) => {
        if (cancelled) return;
        clearTimeout(giveUp);
        objectUrl = URL.createObjectURL(blob);
        fromBlob.current = true;
        setStored({ forUrl: url, status: "ready", progress: 1, src: objectUrl });
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(giveUp);
        fromBlob.current = false;
        setStored({ forUrl: url, status: "stream", progress: 1, src: url });
      });

    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, path]);

  const src = load.src;

  const play = useCallback((): Promise<boolean> | null => {
    const player = ref.current;
    if (!player || !src) return null;
    if (!player.paused) return Promise.resolve(true);

    stopFade.current();
    stopFade.current = fadeIn(player, clampVolume(volume));
    try {
      const target = resolveStartAt(startAt, player.duration);
      if (player.currentTime < target) player.currentTime = target;
    } catch {
      // Some Safari versions refuse seeking before metadata; the
      // loadedmetadata/timeupdate handlers below cover that case.
    }

    let attempt: Promise<void> | undefined;
    try {
      attempt = player.play();
    } catch {
      attempt = Promise.reject(new Error("play() falhou"));
    }
    setPlaying(true);
    setBlocked(false);
    // Old Safari returns undefined instead of a promise.
    return Promise.resolve(attempt).then(
      () => true,
      () => {
        stopFade.current();
        setPlaying(false);
        setBlocked(true);
        return false;
      },
    );
  }, [src, volume, startAt]);

  const toggle = useCallback(() => {
    const player = ref.current;
    if (!player || !src) return;
    if (!player.paused) player.pause();
    else void play();
  }, [src, play]);

  // Courtesy: silence the music when the guest leaves the page, and bring it
  // back when they return, only if it was playing before.
  useEffect(() => {
    function onVisibility() {
      const player = ref.current;
      if (!player) return;
      if (document.hidden) {
        if (!player.paused) {
          resumeWhenVisible.current = true;
          player.pause();
        }
      } else if (resumeWhenVisible.current) {
        resumeWhenVisible.current = false;
        void play();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [play]);

  useEffect(() => () => stopFade.current(), []);

  const elementProps = {
    src,
    onLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
      const player = event.currentTarget;
      const target = resolveStartAt(startAt, player.duration);
      if (player.currentTime < target) player.currentTime = target;
    },
    onTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
      const player = event.currentTarget;
      const target = resolveStartAt(startAt, Number.NaN);
      // The loop restarts at zero; skip the silent intro there too.
      if (!player.paused && target > 0 && player.currentTime < Math.min(0.5, target / 2)) {
        player.currentTime = target;
      }
    },
    onPlay() {
      setPlaying(true);
      setStarted(true);
      setBlocked(false);
    },
    onPause() {
      setPlaying(false);
    },
    onError() {
      setPlaying(false);
      setBlocked(false);
      if (fromBlob.current && url) {
        // The in-memory copy was refused (type/codec); try the remote file.
        fromBlob.current = false;
        setStored({ forUrl: url, status: "stream", progress: 1, src: url });
        return;
      }
      setStored((current) => ({
        progress: 1,
        ...(current?.forUrl === url ? current : {}),
        forUrl: url,
        status: "failed",
      }));
    },
  };

  const status: AudioLoad = url ? load.status : "none";
  return {
    ref,
    status,
    progress: load.progress,
    playing,
    started,
    blocked,
    play,
    toggle,
    elementProps,
  };
}
