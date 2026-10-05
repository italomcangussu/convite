"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  type FormEvent,
  type RefObject,
} from "react";
import InkStar from "./InkStar";
import SparkBurst from "./SparkBurst";

type Props = {
  text: string;
  family: string;
  onFamily: (value: string) => void;
  status: string;
  confirmed: boolean;
  busy: boolean;
  /** True right after a new confirmation: releases the stardust. */
  celebrate: boolean;
  chapter: string;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  /** Where focus goes back to when the dialog closes. */
  returnFocus: RefObject<HTMLElement | null>;
};

/**
 * The last chapter of the invitation, shown as a dialog: the whole point of
 * the invitation is that the family types its name and confirms.
 * Made for the iPhone: it follows the visual viewport, so the card stays in
 * the part of the screen the keyboard leaves free.
 */
export default function RsvpDialog({
  text,
  family,
  onFamily,
  status,
  confirmed,
  busy,
  celebrate,
  chapter,
  onSubmit,
  onClose,
  returnFocus,
}: Props) {
  const overlay = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  const close = useEffectEvent(onClose);
  const restoreFocus = useEffectEvent(() =>
    returnFocus.current?.focus({ preventScroll: true }),
  );

  useEffect(() => {
    const element = overlay.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    function sync() {
      element!.setAttribute("data-vv", "");
      element!.style.setProperty("--vv-top", `${viewport!.offsetTop}px`);
      element!.style.setProperty("--vv-h", `${viewport!.height}px`);
    }
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    openedAt.current = performance.now();
    // A keyboard that pops up over the opening animation is jarring on touch
    // screens: there the guest taps the field; with a mouse it is ready to type.
    const typing = window.matchMedia("(pointer: fine)").matches;
    (typing && input.current ? input.current : sheet.current)?.focus({
      preventScroll: true,
    });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // The button that opened the dialog is inert while it is open, which
      // drops its focus (and Safari never focuses buttons on tap): go back to
      // it explicitly.
      restoreFocus();
    };
  }, []);

  return (
    <div
      ref={overlay}
      className="rsvp-overlay"
      onClick={(event) => {
        // The tap that opened the dialog can still deliver its click to the
        // backdrop; ignore clicks in the first instants.
        if (performance.now() - openedAt.current < 450) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={sheet}
        className="rsvp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className="rsvp-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7 7 17" />
          </svg>
        </button>
        <div className="chapter">
          <span className="chapter-progress">{chapter}</span>
          <span className="chapter-title">Sua família, nossa história</span>
        </div>
        {confirmed ? (
          <div className="rsvp-done">
            <div className="rsvp-seal">
              <InkStar />
              {celebrate && <SparkBurst />}
            </div>
            <h2 id="rsvp-title">Presença confirmada!</h2>
            {family && <p className="rsvp-family">{family}</p>}
            <p className="narrative">
              Esperamos vocês para viver essa aventura conosco.
            </p>
            <button type="button" className="rsvp-finish" onClick={onClose}>
              Voltar ao livro
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Uma aventura é melhor em companhia</p>
            <h2 id="rsvp-title">
              Tem um lugar
              <br />
              para vocês
              <br />
              <em>nas nossas estrelas.</em>
            </h2>
            <p className="narrative">{text}</p>
            <form className="rsvp" onSubmit={onSubmit}>
              <label htmlFor="family">Nome da família</label>
              <input
                ref={input}
                id="family"
                value={family}
                onChange={(event) => onFamily(event.target.value)}
                maxLength={120}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="send"
                placeholder="Família…"
                required
              />
              <button disabled={busy}>
                {busy ? "Confirmando…" : "Confirmar presença"}{" "}
                <span>
                  <InkStar />
                </span>
              </button>
              <p className="feedback" role="status">
                {status}
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
