"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import Icon from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { defaults, type Content } from "@/lib/content";
import {
  fitsWhatsAppLink,
  rsvpWhatsAppText,
  whatsAppLink,
} from "@/lib/whatsapp";
import { CoverPanel, EventPanel, TextsPanel } from "./ContentPanels";
import GiftsPanel from "./GiftsPanel";
import MusicPanel from "./MusicPanel";
import Overview from "./Overview";
import RsvpPanel, { type Rsvp } from "./RsvpPanel";
import { SAVEABLE, TABS, type TabKey } from "./tabs";

type Tone = "success" | "error" | "info";
type Flash = { text: string; tone: Tone } | null;

const hhmm = (d: Date) =>
  d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  });

export default function Admin() {
  const [authorized, setAuthorized] = useState(false),
    [checking, setChecking] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [content, setContent] = useState<Content>(defaults),
    [saved, setSaved] = useState(JSON.stringify(defaults)),
    [savedAt, setSavedAt] = useState<Date | null>(null),
    [tab, setTab] = useState<TabKey>("overview"),
    [flash, setFlash] = useState<Flash>(null),
    [busy, setBusy] = useState(false),
    [rsvps, setRsvps] = useState<Rsvp[]>([]),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("newest");
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((text: string, tone: Tone = "info") => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(text ? { text, tone } : null);
    // Good news fades by itself; problems stay until dismissed or replaced.
    if (text && tone !== "error")
      flashTimer.current = setTimeout(() => setFlash(null), 5000);
  }, []);

  const dirty = authorized && JSON.stringify(content) !== saved;
  const update = (patch: Partial<Content>) =>
    setContent((current) => ({ ...current, ...patch }));

  // The section lives in the address (#confirmacoes-style), so the back button
  // returns to the previous section and a section can be bookmarked.
  function selectTab(key: TabKey) {
    if (key === tab) return;
    setTab(key);
    setFlash(null);
    window.history.pushState(null, "", `#${key}`);
    window.scrollTo({ top: 0 });
  }

  const load = useCallback(async () => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAuthorized(false);
      setChecking(false);
      return;
    }
    const { data: allowed } = await supabase.rpc("is_admin");
    if (!allowed) {
      setAuthorized(false);
      setChecking(false);
      notify("Este usuário não tem acesso à administração.", "error");
      return;
    }
    const [settings, confirmations] = await Promise.all([
      supabase.from("site_settings").select("content").eq("id", 1).single(),
      supabase
        .from("rsvps")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (settings.error || confirmations.error) {
      notify(
        "Não foi possível carregar os dados. Verifique a configuração do banco.",
        "error",
      );
      setAuthorized(false);
    } else {
      const loaded = { ...defaults, ...settings.data.content } as Content;
      const loadedStartAt = Number(loaded.audioStartAt);
      const loadedVolume = Number(loaded.volume);
      const normalized: Content = {
        ...loaded,
        audioStartAt: Number.isFinite(loadedStartAt)
          ? Math.max(0, loadedStartAt)
          : 0,
        volume: Number.isFinite(loadedVolume)
          ? Math.min(1, Math.max(0, loadedVolume))
          : defaults.volume,
      };
      setContent(normalized);
      setSaved(JSON.stringify(normalized));
      setRsvps(confirmations.data);
      setAuthorized(true);
      const fromHash = TABS.find((t) => `#${t.key}` === window.location.hash);
      if (fromHash) setTab(fromHash.key);
    }
    setChecking(false);
  }, [notify]);

  useEffect(() => {
    void load();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [load]);

  useEffect(() => {
    function fromAddress() {
      const found = TABS.find((t) => `#${t.key}` === window.location.hash);
      setTab(found ? found.key : "overview");
    }
    window.addEventListener("popstate", fromAddress);
    window.addEventListener("hashchange", fromAddress);
    return () => {
      window.removeEventListener("popstate", fromAddress);
      window.removeEventListener("hashchange", fromAddress);
    };
  }, []);

  // Leaving with unsaved edits is the easiest way to lose work.
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    notify("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) notify("E-mail ou senha inválidos.", "error");
    else await load();
    setBusy(false);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    const snapshot = JSON.stringify(content);
    const { error } = await supabase
      .from("site_settings")
      .update({ content })
      .eq("id", 1);
    if (error) notify("Não foi possível salvar. Tente novamente.", "error");
    else {
      setSaved(snapshot);
      setSavedAt(new Date());
      notify("Alterações salvas.", "success");
    }
    setBusy(false);
  }

  // Ctrl/Cmd + S saves while there is something to save.
  const saveShortcut = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && dirty) {
      e.preventDefault();
      void save();
    }
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => saveShortcut(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function upload(file: File | undefined) {
    if (!supabase || !file || busy) return;
    if (
      file.size > 20 * 1024 * 1024 ||
      ![
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/x-wav",
      ].includes(file.type)
    ) {
      notify("Use MP3, M4A, OGG ou WAV, até 20 MB.", "error");
      return;
    }
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
    const { error } = await supabase.storage
      .from("soundtracks")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
    if (error) {
      notify("Não foi possível enviar a música.", "error");
      setBusy(false);
      return;
    }
    const next = {
      ...content,
      audioPath: path,
      audioName: file.name,
      audioStartAt: 0,
    };
    const { error: saveError } = await supabase
      .from("site_settings")
      .update({ content: next })
      .eq("id", 1);
    if (saveError) {
      await supabase.storage.from("soundtracks").remove([path]);
      notify("Não foi possível ativar a música.", "error");
    } else {
      if (content.audioPath)
        await supabase.storage.from("soundtracks").remove([content.audioPath]);
      setContent(next);
      setSaved(JSON.stringify(next));
      notify("Música atualizada.", "success");
    }
    setBusy(false);
  }

  async function removeAudio() {
    if (!supabase || busy) return;
    setBusy(true);
    const next = { ...content, audioPath: "", audioName: "" };
    const { error } = await supabase
      .from("site_settings")
      .update({ content: next })
      .eq("id", 1);
    if (error) notify("Não foi possível remover a música.", "error");
    else {
      if (content.audioPath)
        await supabase.storage.from("soundtracks").remove([content.audioPath]);
      setContent(next);
      setSaved(JSON.stringify(next));
      notify("Música removida.", "success");
    }
    setBusy(false);
  }

  async function removeRsvp(id: string, name: string) {
    if (!supabase || busy || !window.confirm(`Remover a confirmação de ${name}?`))
      return;
    setBusy(true);
    const { error } = await supabase.from("rsvps").delete().eq("id", id);
    if (error) notify("Não foi possível remover.", "error");
    else {
      setRsvps((current) => current.filter((r) => r.id !== id));
      notify("Confirmação removida.", "success");
    }
    setBusy(false);
  }

  const filtered = rsvps
    .filter((r) =>
      r.family_name
        .toLocaleLowerCase("pt-BR")
        .includes(search.trim().toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.family_name.localeCompare(b.family_name, "pt-BR")
        : sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
    );

  function csv() {
    const cell = (s: string) =>
      `"${(/^[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
    const csv =
      "\uFEFF" +
      [
        ["Família", "Data e horário", "Status"],
        ...filtered.map((r) => [
          r.family_name,
          new Date(r.created_at).toLocaleString("pt-BR", {
            timeZone: "America/Fortaleza",
          }),
          r.status,
        ]),
      ]
        .map((row) => row.map(cell).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "confirmacoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const listText = () =>
    rsvpWhatsAppText({
      title: content.name,
      families: filtered.map((r) => r.family_name),
      updatedAt: new Date(),
    });

  // Sends the list the admin is looking at (same filter and order as the CSV).
  async function whatsapp() {
    if (!filtered.length) {
      notify("Nenhuma confirmação para enviar.", "error");
      return;
    }
    const text = listText();
    if (fitsWhatsAppLink(text)) {
      window.open(whatsAppLink(text), "_blank", "noopener,noreferrer");
      return;
    }
    // Too long for a link: hand the text over through the clipboard instead.
    try {
      await navigator.clipboard.writeText(text);
      notify(
        "A lista é grande demais para o link do WhatsApp. Copiei o texto: abra a conversa e cole.",
        "info",
      );
    } catch {
      notify(
        "A lista é grande demais para o link do WhatsApp e não foi possível copiar. Use Exportar CSV.",
        "error",
      );
    }
  }

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(done, "success");
    } catch {
      notify("Não foi possível copiar. Selecione o texto e copie manualmente.", "error");
    }
  }

  if (checking)
    return (
      <main className="admin-shell">
        <p className="admin-loading">Carregando…</p>
      </main>
    );

  if (!authorized)
    return (
      <main className="admin-shell admin-login-shell">
        <div className="admin-login">
          <p className="eyebrow">O livro de Vicente</p>
          <h1>Administração</h1>
          {!supabase ? (
            <p className="admin-muted">
              Configure o Supabase para habilitar o acesso seguro ao painel.
              Consulte as instruções no README do projeto.
            </p>
          ) : (
            <form className="admin-form" onSubmit={login}>
              <div className="admin-field">
                <label htmlFor="admin-email">E-mail</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="admin-password">Senha</label>
                <div className="admin-password">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="admin-btn ghost icon-only"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
                  </button>
                </div>
              </div>
              <button className="admin-btn primary" disabled={busy}>
                {busy ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}
          <p
            className={`admin-note ${flash?.tone ?? ""}`}
            role="status"
          >
            {flash?.text}
          </p>
          <Link className="admin-link" href="/">
            <Icon name="arrowLeft" size={14} />
            Voltar ao convite
          </Link>
        </div>
      </main>
    );

  const siteUrl = `${window.location.origin}/`;
  const now = new Date();

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <div className="admin-brand">
          <p className="eyebrow">Administração</p>
          <h1>O livro de {content.name}</h1>
        </div>
        <div className="admin-top-actions">
          <a className="admin-btn secondary small" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={15} />
            Ver convite
          </a>
          <button
            type="button"
            className="admin-btn ghost small"
            onClick={async () => {
              await supabase?.auth.signOut();
              setAuthorized(false);
              setPassword("");
            }}
          >
            <Icon name="logout" size={15} />
            Sair
          </button>
        </div>
      </header>

      <nav className="admin-nav" aria-label="Seções do painel">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="admin-tab"
            aria-current={tab === t.key ? "page" : undefined}
            onClick={(e) => {
              selectTab(t.key);
              // Keeps the chosen section in view on the scrolling tab bar.
              e.currentTarget.scrollIntoView({
                inline: "center",
                block: "nearest",
                behavior: "smooth",
              });
            }}
          >
            <Icon name={t.icon} size={17} />
            {t.label}
            {t.key === "rsvps" && rsvps.length > 0 && (
              <span className="admin-badge">{rsvps.length}</span>
            )}
          </button>
        ))}
      </nav>

      {flash && (
        <div className={`admin-toast ${flash.tone}`} role="status">
          <Icon name={flash.tone === "error" ? "alert" : "check"} size={18} />
          <span>{flash.text}</span>
          <button
            type="button"
            className="admin-toast-close"
            onClick={() => setFlash(null)}
            aria-label="Fechar aviso"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {tab === "overview" && (
        <Overview
          content={content}
          rsvps={rsvps}
          siteUrl={siteUrl}
          now={now}
          go={selectTab}
          copyLink={() => void copy(siteUrl, "Link copiado.")}
        />
      )}

      {SAVEABLE.includes(tab) && (
        <form className="admin-form admin-stack" onSubmit={save}>
          {tab === "cover" && <CoverPanel content={content} update={update} />}
          {tab === "texts" && <TextsPanel content={content} update={update} />}
          {tab === "event" && <EventPanel content={content} update={update} />}
          {tab === "gifts" && <GiftsPanel content={content} update={update} />}
          {tab === "music" && (
            <MusicPanel
              content={content}
              update={update}
              busy={busy}
              upload={(file) => void upload(file)}
              remove={() => void removeAudio()}
            />
          )}
          <div className={`admin-savebar ${dirty ? "dirty" : ""}`}>
            <p className="admin-savestate" role="status">
              {dirty ? (
                <>
                  <span className="admin-dot" aria-hidden="true" />
                  Alterações não salvas
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Tudo salvo{savedAt ? ` às ${hhmm(savedAt)}` : ""}
                </>
              )}
            </p>
            <button className="admin-btn primary" disabled={busy || !dirty}>
              <Icon name="save" size={16} />
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      )}

      {tab === "rsvps" && (
        <RsvpPanel
          total={rsvps.length}
          rows={filtered}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          busy={busy}
          now={now}
          onRemove={(id, name) => void removeRsvp(id, name)}
          onCsv={csv}
          onWhatsapp={() => void whatsapp()}
          onCopyList={() => void copy(listText(), "Lista copiada.")}
          onRefresh={() => void load()}
          onCopyLink={() => void copy(siteUrl, "Link copiado.")}
        />
      )}
    </main>
  );
}
