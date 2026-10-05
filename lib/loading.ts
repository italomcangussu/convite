export type ContentState = "loading" | "ready" | "error";
export type AudioLoad = "none" | "loading" | "ready" | "stream" | "failed";

export type LoadSnapshot = {
  content: ContentState;
  art: boolean;
  fonts: boolean;
  audio: AudioLoad;
  /** 0..1 download progress of the soundtrack while `audio` is "loading". */
  audioProgress: number;
  /** Set after a long wait: optional assets stop blocking the invitation. */
  slow: boolean;
};

export type BookLoad = {
  ready: boolean;
  error: boolean;
  progress: number;
  stage: "content" | "art" | "audio" | "done" | "error";
};

/**
 * The book may only be opened once everything it needs is in place: the
 * invitation text, the illustrations, the fonts and, when one is configured,
 * the soundtrack. The text is the only hard requirement: if it cannot be
 * fetched the guests would read placeholder copy, so that is an error state.
 * Artwork, fonts and music stop blocking after `slow` so a single stalled
 * request cannot lock everyone out of the invitation.
 */
export function bookLoad(s: LoadSnapshot): BookLoad {
  if (s.content === "error") {
    return { ready: false, error: true, progress: 0, stage: "error" };
  }

  const audioDone = s.audio !== "loading";
  const optionalDone = s.art && s.fonts && audioDone;
  const ready = s.content === "ready" && (optionalDone || s.slow);

  const parts: [weight: number, value: number][] = [
    [0.3, s.content === "ready" ? 1 : 0],
    [0.25, s.art ? 1 : 0],
    [0.05, s.fonts ? 1 : 0],
  ];
  if (s.audio !== "none") {
    parts.push([0.4, audioDone ? 1 : Math.min(1, Math.max(0, s.audioProgress))]);
  }
  const total = parts.reduce((sum, [weight]) => sum + weight, 0);
  const done = parts.reduce((sum, [weight, value]) => sum + weight * value, 0);
  const progress = ready ? 1 : Math.min(0.97, Math.max(0.04, done / total));

  const stage: BookLoad["stage"] = ready
    ? "done"
    : s.content !== "ready"
      ? "content"
      : !s.art || !s.fonts
        ? "art"
        : "audio";

  return { ready, error: false, progress, stage };
}
