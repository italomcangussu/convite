export const DEFAULT_VOLUME = 0.5;

/** Volume saved by the admin, clamped to the range browsers accept. */
export function clampVolume(value: unknown, fallback = DEFAULT_VOLUME) {
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : fallback;
}

/** Where the soundtrack should begin, never past the end of the file. */
export function resolveStartAt(startAt: unknown, duration: number) {
  const configured = Number(startAt);
  const wanted = Number.isFinite(configured) ? Math.max(0, configured) : 0;
  return Number.isFinite(duration)
    ? Math.min(wanted, Math.max(0, duration - 0.25))
    : wanted;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
};

/**
 * Safari refuses blob audio whose type is not an audio type, so a generic
 * `application/octet-stream` from the storage layer is replaced by the type
 * implied by the file extension.
 */
export function audioMimeType(path: string, headerType?: string | null) {
  const header = (headerType ?? "").split(";")[0].trim().toLowerCase();
  if (header.startsWith("audio/")) return header;
  const extension = path.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "audio/mpeg";
}

export type DownloadAudioOptions = {
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
  /** Gives up when no byte arrives for this long. */
  stallMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Downloads the whole soundtrack into memory. Played from a Blob, the track
 * starts the instant the user taps "Abrir o livro": iOS Safari does not
 * preload remote media before a gesture, so a remote `src` can only begin
 * buffering after the tap, which is exactly the delay we want to remove.
 */
export async function downloadAudio(
  url: string,
  path: string,
  {
    signal,
    onProgress,
    stallMs = 10_000,
    fetchImpl = fetch,
  }: DownloadAudioOptions = {},
) {
  const controller = new AbortController();
  const relay = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", relay, { once: true });

  let stalled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, stallMs);
  };

  try {
    watch();
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Falha ao baixar o áudio (${response.status}).`);
    }
    const total = Number(response.headers.get("content-length")) || 0;
    const type = audioMimeType(path, response.headers.get("content-type"));

    if (!response.body) {
      const blob = await response.blob();
      onProgress?.(blob.size, blob.size);
      return new Blob([blob], { type });
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loaded = 0;
    for (;;) {
      watch();
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
    return new Blob(chunks, { type });
  } catch (error) {
    if (stalled) throw new Error("Tempo esgotado ao baixar o áudio.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
}

type VolumeControl = { volume: number };

/**
 * Ramps the volume up from silence so the music blooms with the cover.
 * iOS Safari ignores writes to `volume` (it is always 1): there the ramp is
 * skipped instead of leaving the track muted. The returned function ends the
 * ramp early and snaps to the target volume.
 */
export function fadeIn(player: VolumeControl, target: number, ms = 1800) {
  player.volume = 0;
  if (target <= 0 || ms <= 0 || player.volume !== 0) {
    player.volume = target;
    return () => {};
  }
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - startedAt) / ms);
    player.volume = target * t * t * (3 - 2 * t);
    if (t >= 1) clearInterval(timer);
  }, 50);
  return () => {
    clearInterval(timer);
    player.volume = target;
  };
}
