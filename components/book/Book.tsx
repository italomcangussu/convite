"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { displayDate, maps } from "@/lib/content";
import { bookLoad } from "@/lib/loading";
import { supabase } from "@/lib/supabase";
import Scene from "./Scene";
import InkStar from "./InkStar";
import RsvpDialog from "./RsvpDialog";
import SparkBurst from "./SparkBurst";
import { useBookAudio } from "./useBookAudio";
import { useInvitationContent } from "./useInvitationContent";
const chapters = [
  "Uma nova estrela",
  "O que nos aproxima",
  "O dia da aventura",
  "Nosso encontro",
  "Pequenos presentes",
  "Até as estrelas",
];
/** The book ends here; the seventh chapter (RSVP) opens as a dialog. */
const LAST_PAGE = chapters.length - 1;
const CHAPTER_COUNT = String(chapters.length + 1).padStart(2, "0");
const CONFIRMED =
  "Presença confirmada. Esperamos vocês para viver essa aventura conosco.";
/** After this long, slow artwork/fonts/music stop blocking the cover. */
const SLOW_MS = 14_000;
type PageGesture = {
  pointerId: number;
  x: number;
  y: number;
  width: number;
  axis: "pending" | "horizontal";
  lastX: number;
  lastAt: number;
  velocity: number;
  captured: boolean;
  /** Direction shown behind the leaf while dragging (1 next, -1 previous). */
  shown: number;
  /** Where the leaf is now: pixels, degrees (3D) and 0..1 of the way over. */
  px: number;
  deg: number;
  progress: number;
};
type TurnFrom = { px: number; deg: number; progress: number };
const dragVars = ["--drag-x", "--drag-r", "--drag-z"] as const;
const turnVars = ["--turn-from-x", "--turn-from-r", "--turn-ms"] as const;
export default function Book() {
  const { content, state: contentState, retry } = useInvitationContent();
  const [page, setPage] = useState(-1),
    [turn, setTurn] = useState(0),
    [dragDir, setDragDir] = useState(0),
    [family, setFamily] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [settlingPage, setSettlingPage] = useState<number | null>(null),
    [art, setArt] = useState({ cover: false, rose: false, flight: false }),
    [fontsReady, setFontsReady] = useState(false),
    [slow, setSlow] = useState(false),
    [rsvpOpen, setRsvpOpen] = useState(false),
    [celebrate, setCelebrate] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLElement>(null);
  const gesture = useRef<PageGesture | null>(null);
  const spring = useRef<Animation | null>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    leafRef.current?.scrollTo({ top: 0 });
  }, [page]);
  const lock = useRef(false),
    rsvpLock = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    requestId = useRef("");
  const audioUrl =
    content.audioPath && supabase
      ? supabase.storage.from("soundtracks").getPublicUrl(content.audioPath)
          .data.publicUrl
      : undefined;
  const audio = useBookAudio({
    url: contentState === "ready" ? audioUrl : undefined,
    path: content.audioPath,
    volume: content.volume,
    startAt: content.audioStartAt,
  });
  const load = bookLoad({
    content: contentState,
    art: art.cover && art.rose && art.flight,
    fonts: fontsReady,
    audio: audio.status,
    audioProgress: audio.progress,
    slow,
  });
  const markArt = (key: keyof typeof art) =>
    setArt((current) => (current[key] ? current : { ...current, [key]: true }));
  useEffect(() => {
    const wait = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearTimeout(wait);
      if (timer.current) clearTimeout(timer.current);
      spring.current?.cancel();
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    const ready = () => mounted && setFontsReady(true);
    if (document.fonts?.ready) document.fonts.ready.then(ready, ready);
    else ready();
    return () => {
      mounted = false;
    };
  }, []);
  function clearTurnVars() {
    for (const name of turnVars) leafRef.current?.style.removeProperty(name);
    bookRef.current?.style.removeProperty("--turn-p");
  }
  function clearDragVars() {
    for (const name of dragVars) leafRef.current?.style.removeProperty(name);
    bookRef.current?.style.removeProperty("--drag-p");
    bookRef.current?.style.removeProperty("--drag-edge");
  }
  function navigate(direction: number, from?: TurnFrom) {
    if (lock.current || page + direction < 0 || page + direction > LAST_PAGE) return;
    lock.current = true;
    spring.current?.cancel();
    spring.current = null;
    setSettlingPage(null);
    const leaf = leafRef.current;
    // A turn that starts from a drag continues from where the finger left
    // the leaf, and is shorter the farther it already travelled.
    if (from && leaf) {
      leaf.style.setProperty("--turn-from-x", `${from.px}px`);
      leaf.style.setProperty("--turn-from-r", `${from.deg}deg`);
      leaf.style.setProperty(
        "--turn-ms",
        `${Math.round(300 + 360 * (1 - from.progress))}ms`,
      );
      bookRef.current?.style.setProperty("--turn-p", String(from.progress));
    } else clearTurnVars();
    clearDragVars();
    setDragDir(0);
    setTurn(direction);
    timer.current = setTimeout(() => finishTurn(direction), 1000);
  }
  function finishTurn(direction: number) {
    if (!lock.current) return;
    if (timer.current) clearTimeout(timer.current);
    const nextPage = Math.min(LAST_PAGE, Math.max(0, page + direction));
    setSettlingPage(nextPage);
    setPage(nextPage);
    setTurn(0);
    lock.current = false;

    // Keep the already-rendered destination sheet above the updated leaf for
    // two paint frames. This prevents Safari/WebKit from exposing the bare
    // book background while React swaps text and illustrations.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSettlingPage(null));
    });
  }
  function springBack() {
    const leaf = leafRef.current;
    const from = leaf ? getComputedStyle(leaf).transform : "none";
    clearDragVars();
    if (leaf && from !== "none" && typeof leaf.animate === "function") {
      // Release without turning: the leaf eases back instead of snapping.
      const settle = leaf.animate(
        [{ transform: from }, { transform: "none" }],
        { duration: 340, easing: "cubic-bezier(0.22, 1.1, 0.36, 1)" },
      );
      spring.current = settle;
      settle.onfinish = () => {
        if (spring.current === settle) spring.current = null;
        setDragDir(0);
      };
    } else setDragDir(0);
  }
  function beginOpening() {
    if (lock.current || page !== -1) return;
    lock.current = true;
    clearTurnVars();
    setTurn(1);
    timer.current = setTimeout(finishOpening, 1200);
  }
  function open() {
    if (lock.current || page !== -1 || !load.ready) return;
    // The music starts inside this very tap: calling play() synchronously is
    // what iOS Safari requires, and the track is already in memory, so it
    // begins together with the cover instead of after a network round trip.
    void audio.play();
    beginOpening();
  }
  function openRsvp() {
    if (lock.current) return;
    setRsvpOpen(true);
  }
  // On the last page "next" is the RSVP dialog instead of another sheet.
  function goNext() {
    if (page === LAST_PAGE) openRsvp();
    else navigate(1);
  }
  function finishOpening() {
    if (timer.current) clearTimeout(timer.current);
    setPage(0);
    setTurn(0);
    lock.current = false;
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (rsvpLock.current) return;
    if (!family.trim()) {
      setStatus("Informe o nome da sua família.");
      return;
    }
    if (!supabase) {
      setStatus(
        "As confirmações serão abertas em breve. Volte para confirmar sua família.",
      );
      return;
    }
    rsvpLock.current = true;
    setBusy(true);
    setStatus("");
    requestId.current ||= crypto.randomUUID();
    const { error } = await supabase.from("rsvps").insert({
      id: requestId.current,
      family_name: family.trim(),
    });
    setStatus(
      error && error.code !== "23505"
        ? "Não foi possível confirmar agora. Tente novamente."
        : CONFIRMED,
    );
    if (!error || error.code === "23505") {
      setCelebrate(!error);
      localStorage.setItem("vicente-rsvp", requestId.current);
      localStorage.setItem("vicente-family", family.trim());
    }
    setBusy(false);
    rsvpLock.current = false;
  }
  useEffect(() => {
    requestId.current = localStorage.getItem("vicente-rsvp") || "";
    if (requestId.current) {
      setFamily(localStorage.getItem("vicente-family") || "");
      setStatus(CONFIRMED);
    }
  }, []);
  const links = maps(content.address);
  const phase = load.error
    ? "error"
    : page === -1 && turn
      ? "opening"
      : load.ready
        ? "ready"
        : "loading";
  const openingLabel =
    phase === "error"
      ? "Tentar novamente"
      : phase === "loading"
        ? "Preparando o livro…"
        : phase === "opening"
          ? "Abrindo…"
          : audio.status === "failed"
            ? "Abrir sem música"
            : "Abrir o livro";
  const openingHint =
    phase === "error"
      ? "Não foi possível carregar. Confira sua conexão."
      : phase === "loading"
        ? load.stage === "audio"
          ? `Afinando a música… ${Math.round(audio.progress * 100)}%`
          : load.stage === "art"
            ? "Folheando as páginas…"
            : "Preparando o convite…"
        : audio.status === "failed"
          ? "A música não pôde ser carregada. O convite abre sem ela."
          : audioUrl
            ? "Toque uma vez: a música começa junto com o livro."
            : "Toque para abrir o livro.";

  function body(p: number) {
    return (
      <>
        <div className="chapter">
          <span className="chapter-progress">
            PÁGINA {p + 1} <i>·</i> {CHAPTER_COUNT}
          </span>
          <span className="chapter-title">{chapters[p]}</span>
        </div>
        {p === 0 && (
          <>
            <p className="eyebrow">Era uma vez, no nosso universo</p>
            <h2>{content.intro}</h2>
            <Scene variant={1} />
            <p className="narrative">{content.narrative}</p>
            <p className="small-sign">Com amor, nossa família</p>
          </>
        )}
        {p === 1 && (
          <>
            <div className="orbit-symbol">
              <InkStar />
            </div>
            <p className="eyebrow">As coisas que ficam no coração</p>
            <blockquote>{content.quote}</blockquote>
            {content.quoteAuthor && <cite>{content.quoteAuthor}</cite>}
            <Scene variant={2} />
            <p className="small-sign">
              Uma história que estamos escrevendo juntos.
            </p>
          </>
        )}
        {p === 2 && (
          <>
            <p className="eyebrow">Reserve um lugar na sua memória</p>
            <h2>
              O primeiro de
              <br />
              muitos capítulos.
            </h2>
            <div className="event-date">
              {displayDate(content.date, content.dateFormat)}
            </div>
            <p className="event-time">
              {content.time ? `${content.time} horas` : "Horário a anunciar"}
            </p>
            <p className="narrative">{content.dateNote}</p>
            <Scene variant={3} />
          </>
        )}
        {p === 3 && (
          <>
            <p className="eyebrow">Todo encontro tem seu pequeno planeta</p>
            <h2>{content.venue}</h2>
            <Scene variant={4} />
            <p className="address">
              {content.address || "Nosso endereço será anunciado em breve."}
            </p>
            {content.address && (
              <div className="map-actions">
                <a href={links.google} target="_blank" rel="noreferrer">
                  Google Maps ↗
                </a>
                <a href={links.waze} target="_blank" rel="noreferrer">
                  Waze ↗
                </a>
              </div>
            )}
          </>
        )}
        {p === 4 && (
          <>
            <p className="eyebrow">Pequenos gestos, grandes sorrisos</p>
            <h2>
              Presentes para
              <br />
              novas descobertas.
            </h2>
            <p className="narrative">
              Seu carinho já é um presente. Se desejar, aqui estão algumas
              ideias.
            </p>
            <ul className="gift-list">
              {content.gifts
                .filter((g) => g.active)
                .map((g) => (
                  <li key={g.id}>
                    <span>
                      <InkStar />
                    </span>
                    <div>
                      <h3>{g.name}</h3>
                      <p>{g.detail}</p>
                    </div>
                  </li>
                ))}
            </ul>
            <div className="gift-vignette">
              <Scene variant={4} />
            </div>
          </>
        )}
        {p === 5 && (
          <>
            <p className="eyebrow">Esta história continua com você</p>
            <h2>{content.closing}</h2>
            <Scene variant={6} />
            <p className="closing-name">{content.name}</p>
            <p className="small-sign">{content.age} de um amor infinito</p>
            <p className="last-step">
              Falta só um passo: confirmar a presença da sua família.
            </p>
          </>
        )}
        <span className="folio">
          {String(p + 1).padStart(2, "0")}{" "}
          <span>
            <InkStar />
          </span>{" "}
          {CHAPTER_COUNT}
        </span>
      </>
    );
  }
  const dragging = dragDir !== 0;
  // The sheet revealed by a turn (or by a drag in progress) lives under the leaf.
  const underPage =
    settlingPage ??
    (page < 0 ? 0 : Math.min(LAST_PAGE, Math.max(0, page + (turn || dragDir))));
  return (
    <main className="universe" data-phase={page >= 0 ? "open" : phase}>
      <div className="ambient-stars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            className={i % 6 === 2 ? "gold" : undefined}
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              animationDelay: `${i % 7}s`,
              animationDuration: `${4 + ((i * 3) % 5)}s`,
              width: i % 5 === 0 ? 3 : 1,
              height: i % 5 === 0 ? 3 : 1,
            }}
          />
        ))}
        <b className="shooting-star" />
        <b className="shooting-star second" />
      </div>
      <div className={`outer-label ${page >= 0 ? "is-hidden" : ""}`} aria-hidden={page >= 0}>
        UM CONVITE ESCRITO NAS ESTRELAS
      </div>
      <div className="book-stage" inert={rsvpOpen}>
        <div
          ref={bookRef}
          className={`book ${page === -1 ? "closed" : "is-open"} ${page === -1 && turn ? "is-opening" : ""} ${turn ? "turning" : ""} ${dragging ? "is-dragging" : ""}`}
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).closest("input,textarea")) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              if (page === -1) open();
              else goNext();
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              navigate(-1);
            }
          }}
          tabIndex={0}
          aria-label="Livro do aniversário. Arraste a página para avançar ou voltar, toque nas bordas ou use as teclas de direção."
        >
          <div className="inside-cover" aria-hidden="true">
            <Scene
              variant={page === 2 ? 3 : page === 3 || page === 4 ? 4 : 2}
            />
            <span className="inside-cover-note">
              <InkStar />
              <span>com carinho</span>
            </span>
          </div>
          <article
            className={`page under-page ${settlingPage !== null ? "is-settling" : ""}`}
            aria-hidden="true"
            inert
          >
            {body(underPage)}
          </article>
          <article
            ref={leafRef}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              if (
                !["turnNext", "turnPrev", "turnNextMobile", "turnPrevMobile"].includes(
                  e.animationName,
                )
              )
                return;
              if (page === -1) finishOpening();
              else if (turn) finishTurn(turn);
            }}
            className={`page active-page ${page === -1 ? "cover" : ""} ${dragging ? "is-dragging" : ""} ${dragDir === -1 ? "drag-prev" : ""} ${turn === 1 ? "turn-next" : turn === -1 ? "turn-prev" : ""}`}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button,a,input,form"))
                return;
              if (spring.current) {
                spring.current.cancel();
                spring.current = null;
                setDragDir(0);
              }
              gesture.current = {
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                width: e.currentTarget.getBoundingClientRect().width,
                axis: "pending",
                lastX: e.clientX,
                lastAt: e.timeStamp,
                velocity: 0,
                captured: false,
                shown: 0,
                px: 0,
                deg: 0,
                progress: 0,
              };
            }}
            onPointerMove={(e) => {
              const active = gesture.current;
              if (!active || active.pointerId !== e.pointerId) return;
              const dx = e.clientX - active.x;
              const dy = e.clientY - active.y;
              if (active.axis === "pending") {
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 9) return;
                if (Math.abs(dy) > Math.abs(dx) * 1.15) {
                  gesture.current = null;
                  return;
                }
                if (
                  Math.abs(dx) <= Math.abs(dy) * 1.15 ||
                  page < 0 ||
                  lock.current
                )
                  return;
                active.axis = "horizontal";
              }
              if (active.axis !== "horizontal" || page < 0 || lock.current)
                return;
              if (!active.captured) {
                e.currentTarget.setPointerCapture(e.pointerId);
                active.captured = true;
              }
              e.preventDefault();
              const elapsed = Math.max(1, e.timeStamp - active.lastAt);
              active.velocity = (e.clientX - active.lastX) / elapsed;
              active.lastX = e.clientX;
              active.lastAt = e.timeStamp;

              // The leaf follows the finger. At the first/last page there is
              // nothing to reveal, so it only gives a little (rubber band).
              const direction = dx < 0 ? 1 : -1;
              const atEdge = page + direction < 0 || page + direction > LAST_PAGE;
              const travelled = Math.max(-1, Math.min(1, dx / active.width));
              const eased = atEdge
                ? Math.sign(travelled) * Math.min(0.1, Math.abs(travelled) * 0.3)
                : travelled;
              active.progress = Math.abs(eased);
              active.px = eased * active.width;
              active.deg = eased * 78;
              const leaf = e.currentTarget;
              leaf.style.setProperty("--drag-x", `${active.px}px`);
              leaf.style.setProperty("--drag-r", `${active.deg}deg`);
              leaf.style.setProperty("--drag-z", `${eased * -1.2}deg`);
              bookRef.current?.style.setProperty("--drag-p", String(active.progress));
              bookRef.current?.style.setProperty("--drag-edge", atEdge ? "1" : "0");
              if (active.shown !== direction) {
                active.shown = direction;
                setDragDir(direction);
              }
            }}
            onPointerUp={(e) => {
              const active = gesture.current;
              if (!active || active.pointerId !== e.pointerId) return;
              const dx = e.clientX - active.x,
                dy = e.clientY - active.y;
              gesture.current = null;
              if (page < 0) return;
              const direction = dx < 0 ? 1 : -1;
              const commits =
                active.axis === "horizontal" &&
                (Math.abs(dx) > Math.max(42, active.width * 0.16) ||
                  (Math.abs(dx) > 22 && Math.abs(active.velocity) > 0.45));
              const atEdge = page + direction < 0 || page + direction > LAST_PAGE;
              if (commits && !atEdge) {
                navigate(direction, {
                  px: active.px,
                  deg: active.deg,
                  progress: active.progress,
                });
              } else if (active.axis === "horizontal") {
                springBack();
                // Pulling past the last page asks for the RSVP.
                if (commits && direction === 1 && page === LAST_PAGE) openRsvp();
              } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
                const rect = e.currentTarget.getBoundingClientRect();
                if (e.clientX - rect.left < rect.width * 0.16) navigate(-1);
                if (e.clientX - rect.left > rect.width * 0.84) goNext();
              }
            }}
            onPointerCancel={() => {
              const active = gesture.current;
              gesture.current = null;
              if (active?.axis === "horizontal") springBack();
            }}
          >
            {page === -1 ? (
              <>
                <div className="cover-sheen" aria-hidden="true" />
                <div className="cover-border" />
                <p className="cover-series">
                  Um livro de amor & pequenas descobertas
                </p>
                <p className="cover-title">{content.title}</p>
                <div className="tiny-star">
                  <InkStar />
                </div>
                <h1>
                  {content.name.split(" ").map((word, i) => (
                    <span key={i}>{word} </span>
                  ))}
                </h1>
                <p className="age">{content.age}</p>
                <Scene onReady={() => markArt("cover")} />
                <p className="cover-subtitle">{content.subtitle}</p>
                <button
                  className="open-book"
                  data-state={phase}
                  onClick={phase === "error" ? retry : open}
                  disabled={phase === "loading" || phase === "opening"}
                  aria-busy={phase === "loading"}
                  aria-describedby="open-book-hint"
                  style={{ "--load": load.progress } as CSSProperties}
                >
                  {phase === "loading" && (
                    <span className="open-book-spinner" aria-hidden="true" />
                  )}
                  <span className="open-book-label">{openingLabel}</span>
                  {phase === "ready" && (
                    <span className="open-book-arrow" aria-hidden="true">→</span>
                  )}
                  {phase === "error" && (
                    <span className="open-book-arrow" aria-hidden="true">↻</span>
                  )}
                  {phase === "loading" && (
                    <span className="open-book-progress" aria-hidden="true" />
                  )}
                </button>
                <p className="open-book-hint" id="open-book-hint">
                  {openingHint}
                </p>
                {/* Announces only the outcome, not every percent of progress. */}
                <p className="sr-only" role="status">
                  {phase === "ready"
                    ? "Convite pronto. Toque em abrir o livro."
                    : phase === "error"
                      ? "Não foi possível carregar o convite."
                      : ""}
                </p>
              </>
            ) : (
              body(page)
            )}
          </article>
        </div>
        {page === -1 && turn === 1 && <SparkBurst />}
      </div>
      {/* Hidden: fetches the remaining illustrations before the book opens so
          no picture pops in while a page is turning. */}
      <div hidden>
        <Scene variant={2} eager onReady={() => markArt("rose")} />
        <Scene variant={3} eager onReady={() => markArt("flight")} />
      </div>
      <audio ref={audio.ref} loop preload="auto" {...audio.elementProps} />
      {/* iPhone on its side: the book is made to be read standing up. */}
      <div className="rotate-hint" role="status">
        <span className="rotate-phone" aria-hidden="true" />
        <p>Gire o celular para ler o convite em pé</p>
      </div>
      {page >= 0 && audioUrl && audio.status !== "failed" && (
        <button
          className={`audio-control ${audio.playing ? "is-playing" : ""} ${audio.started && !audio.blocked ? "" : "needs-tap"}`}
          onClick={audio.toggle}
          aria-label={audio.playing ? "Pausar música" : "Reproduzir música"}
          aria-pressed={audio.playing}
        >
          <span className="equalizer" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          {(!audio.started || audio.blocked) && (
            <span className="audio-hint" aria-hidden="true">
              Toque para ouvir a música
            </span>
          )}
        </button>
      )}
      <footer className="reader-footer" inert={rsvpOpen}>
        <nav
          className={`page-navigation ${page < 0 ? "is-hidden" : ""}`}
          aria-label="Navegação do livro"
          aria-hidden={page < 0}
          inert={page < 0}
        >
          <button type="button" className="page-previous" disabled={page <= 0 || !!turn} onClick={() => navigate(-1)}>
            <span aria-hidden="true">←</span> Página anterior
          </button>
          <button
            ref={nextButton}
            type="button"
            className={`page-next ${page === LAST_PAGE ? "is-final" : ""}`}
            disabled={!!turn}
            onClick={() => (page < 0 ? open() : goNext())}
          >
            {page === LAST_PAGE ? (
              <>
                Confirmar presença{" "}
                <span aria-hidden="true">
                  <InkStar />
                </span>
              </>
            ) : (
              <>
                Próxima página <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </nav>
      </footer>
      {rsvpOpen && (
        <RsvpDialog
          text={content.rsvpText}
          family={family}
          onFamily={setFamily}
          status={status}
          confirmed={status === CONFIRMED}
          busy={busy}
          celebrate={celebrate}
          chapter={`PÁGINA ${chapters.length + 1} · ${CHAPTER_COUNT}`}
          onSubmit={confirm}
          onClose={() => setRsvpOpen(false)}
          returnFocus={nextButton}
        />
      )}
    </main>
  );
}
