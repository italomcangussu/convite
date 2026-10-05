"use client";
import { useEffect, useRef, useState } from "react";
import { defaults, displayDate, maps, type Content } from "@/lib/content";
import { supabase } from "@/lib/supabase";
import Scene from "./Scene";
import InkStar from "./InkStar";
const chapters = [
  "Uma nova estrela",
  "O que nos aproxima",
  "O dia da aventura",
  "Nosso encontro",
  "Pequenos presentes",
  "Sua família, nossa história",
  "Até as estrelas",
];
export default function Book() {
  const [content, setContent] = useState<Content>(defaults),
    [page, setPage] = useState(-1),
    [turn, setTurn] = useState(0),
    [drag, setDrag] = useState(0),
    [playing, setPlaying] = useState(false),
    [family, setFamily] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const leafRef = useRef<HTMLElement>(null);
  useEffect(() => {
    leafRef.current?.scrollTo({ top: 0 });
  }, [page]);
  const audio = useRef<HTMLAudioElement>(null),
    start = useRef<{ x: number; y: number } | null>(null),
    lock = useRef(false),
    rsvpLock = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    requestId = useRef("");
  useEffect(() => {
    let mounted = true;
    if (supabase)
      supabase
        .from("site_settings")
        .select("content")
        .eq("id", 1)
        .single()
        .then(({ data }) => {
          if (mounted && data) setContent({ ...defaults, ...data.content });
        });
    return () => {
      mounted = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function toggleAudio() {
    if (!audio.current || !content.audioPath) return;
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      audio.current.volume = content.volume;
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }
  function navigate(direction: number) {
    if (lock.current || page + direction < 0 || page + direction > 6) return;
    lock.current = true;
    setDrag(0);
    setTurn(direction);
    timer.current = setTimeout(() => {
      setPage((p) => p + direction);
      setTurn(0);
      lock.current = false;
    }, 650);
  }
  function open() {
    if (lock.current) return;
    lock.current = true;
    setTurn(1);
    void toggleAudio();
    timer.current = setTimeout(() => {
      setPage(0);
      setTurn(0);
      lock.current = false;
    }, 900);
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
        : "Presença confirmada. Esperamos vocês para viver essa aventura conosco.",
    );
    if (!error || error.code === "23505") {
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
      setStatus(
        "Presença confirmada. Esperamos vocês para viver essa aventura conosco.",
      );
    }
  }, []);
  const links = maps(content.address);
  const audioUrl =
    content.audioPath && supabase
      ? supabase.storage.from("soundtracks").getPublicUrl(content.audioPath)
          .data.publicUrl
      : undefined;
  function body(p: number, behind = false) {
    return (
      <>
        <div className="chapter">
          <span>{String(p + 1).padStart(2, "0")}</span> · {chapters[p]}
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
            <p className="eyebrow">Uma aventura é melhor em companhia</p>
            <h2>
              Tem um lugar
              <br />
              para vocês
              <br />
              <em>nas nossas estrelas.</em>
            </h2>
            <p className="narrative">{content.rsvpText}</p>
            <form className="rsvp" onSubmit={confirm}>
              <label htmlFor={behind ? "family-preview" : "family"}>
                Nome da família
              </label>
              <input
                id={behind ? "family-preview" : "family"}
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                maxLength={120}
                autoComplete="name"
                placeholder="Família…"
                required
              />
              <button
                disabled={busy || status.startsWith("Presença confirmada")}
              >
                {busy ? "Confirmando…" : "Confirmar presença"}{" "}
                <span>
                  <InkStar />
                </span>
              </button>
              <p className="feedback" role="status">
                {status}
              </p>
            </form>
            <div className="orbit-symbol small">
              <InkStar />
            </div>
          </>
        )}
        {p === 6 && (
          <>
            <p className="eyebrow">Esta história continua com você</p>
            <h2>{content.closing}</h2>
            <Scene variant={6} />
            <p className="closing-name">{content.name}</p>
            <p className="small-sign">{content.age} de um amor infinito</p>
          </>
        )}
        <span className="folio">
          {String(p + 1).padStart(2, "0")}{" "}
          <span>
            <InkStar />
          </span>{" "}
          07
        </span>
      </>
    );
  }
  return (
    <main className="universe">
      <div className="ambient-stars" aria-hidden="true">
        {Array.from({ length: 45 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              animationDelay: `${i % 7}s`,
              width: i % 5 === 0 ? 3 : 1,
              height: i % 5 === 0 ? 3 : 1,
            }}
          />
        ))}
      </div>
      <div className="outer-label">UM CONVITE ESCRITO NAS ESTRELAS</div>
      <div className="book-stage">
        <div
          className={`book ${page === -1 ? "closed" : ""} ${turn ? "turning" : ""}`}
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).closest("input,textarea")) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              navigate(1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              navigate(-1);
            }
          }}
          tabIndex={0}
          aria-label="Livro do aniversário. Use as teclas direita e esquerda para virar as páginas."
        >
          {
            <article className="page under-page" aria-hidden="true" inert>
              {body(page < 0 ? 0 : Math.min(6, Math.max(0, page + turn)), true)}
            </article>
          }
          <article
            ref={leafRef}
            className={`page active-page ${page === -1 ? "cover" : ""} ${turn === 1 ? "turn-next" : turn === -1 ? "turn-prev" : ""}`}
            style={
              drag
                ? {
                    transform: `rotateY(${Math.max(-45, Math.min(45, drag / 5))}deg)`,
                  }
                : undefined
            }
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button,a,input,form"))
                return;
              start.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (
                start.current &&
                page >= 0 &&
                !lock.current &&
                Math.abs(e.clientX - start.current.x) > 15
              )
                setDrag(e.clientX - start.current.x);
            }}
            onPointerUp={(e) => {
              if (!start.current) return;
              const dx = e.clientX - start.current.x,
                dy = e.clientY - start.current.y;
              start.current = null;
              setDrag(0);
              if (page < 0) return;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                navigate(dx < 0 ? 1 : -1);
              } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
                const rect = e.currentTarget.getBoundingClientRect();
                if (e.clientX - rect.left < rect.width * 0.16) navigate(-1);
                if (e.clientX - rect.left > rect.width * 0.84) navigate(1);
              }
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(0);
            }}
          >
            {page === -1 ? (
              <>
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
                <Scene />
                <p className="cover-subtitle">{content.subtitle}</p>
                <button className="open-book" onClick={open}>
                  Abrir o livro{" "}
                  <span>
                    <InkStar />
                  </span>
                </button>
              </>
            ) : (
              body(page)
            )}
          </article>
        </div>
      </div>
      {audioUrl && (
        <>
          <audio
            ref={audio}
            src={audioUrl}
            loop
            preload="none"
            onError={() => setPlaying(false)}
          />
          <button
            className="audio-control"
            onClick={toggleAudio}
            aria-label={playing ? "Pausar música" : "Reproduzir música"}
            aria-pressed={playing}
          >
            {playing ? "♫" : "♪"}
          </button>
        </>
      )}
      <p className="outer-dedication">Para quem faz parte do nosso universo.</p>
    </main>
  );
}
