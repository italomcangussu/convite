"use client";
import { useCallback, useEffect, useState } from "react";
import { defaults, type Content } from "@/lib/content";
import type { ContentState } from "@/lib/loading";
import { supabase } from "@/lib/supabase";

const ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 8_000;
// PostgREST: ".single()" matched no row. The row is created by the migration,
// but an empty table is a valid (unedited) invitation, not a failure.
const NO_ROWS = "PGRST116";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads the editable invitation text. Without Supabase credentials the local
 * defaults are the invitation. With credentials a failed request is an error:
 * showing the placeholder copy would present wrong details (date, address) to
 * guests, so the book stays closed and offers a retry instead.
 */
export function useInvitationContent() {
  const [content, setContent] = useState<Content>(defaults);
  const [state, setState] = useState<ContentState>(supabase ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    let inFlight: AbortController | undefined;

    (async () => {
      for (let i = 0; i < ATTEMPTS && alive; i++) {
        inFlight = new AbortController();
        const request = inFlight;
        const timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);
        try {
          const { data, error } = await client
            .from("site_settings")
            .select("content")
            .eq("id", 1)
            .abortSignal(request.signal)
            .single();
          if (!alive) return;
          if (data) {
            setContent({ ...defaults, ...data.content });
            setState("ready");
            return;
          }
          if (error?.code === NO_ROWS) {
            setState("ready");
            return;
          }
        } catch {
          // Network failure or timeout: fall through to the next attempt.
        } finally {
          clearTimeout(timeout);
        }
        if (i < ATTEMPTS - 1) await wait(900 * (i + 1));
      }
      if (alive) setState("error");
    })();

    return () => {
      alive = false;
      inFlight?.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((n) => n + 1);
  }, []);
  return { content, state, retry };
}
