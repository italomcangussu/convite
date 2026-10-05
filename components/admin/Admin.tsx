"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { defaults, type Content } from "@/lib/content";
type RSVP = {
  id: string;
  family_name: string;
  created_at: string;
  status: string;
};
const sections = [
  "Visão geral",
  "Conteúdo",
  "Data e local",
  "Lista de presentes",
  "Música",
  "Confirmações",
  "Configurações",
];
export default function Admin() {
  const [authorized, setAuthorized] = useState(false),
    [checking, setChecking] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [content, setContent] = useState<Content>(defaults),
    [tab, setTab] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [rsvps, setRsvps] = useState<RSVP[]>([]),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("newest");
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
      setMessage("Este usuário não tem acesso à administração.");
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
      setMessage(
        "Não foi possível carregar os dados. Verifique a configuração do banco.",
      );
      setAuthorized(false);
    } else {
      setContent({ ...defaults, ...settings.data.content });
      setRsvps(confirmations.data);
      setAuthorized(true);
    }
    setChecking(false);
  }, []);
  useEffect(() => {
    void load();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [load]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage("E-mail ou senha inválidos.");
    else await load();
    setBusy(false);
  }
  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ content })
      .eq("id", 1);
    setMessage(
      error
        ? "Não foi possível salvar. Tente novamente."
        : "Alterações salvas.",
    );
    setBusy(false);
  }
  function field(
    key: keyof Content,
    label: string,
    multiline = false,
    type = "text",
  ) {
    return (
      <label key={key}>
        {label}
        {multiline ? (
          <textarea
            value={String(content[key])}
            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
          />
        ) : (
          <input
            type={type}
            value={String(content[key])}
            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
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
      setMessage("Use MP3, M4A, OGG ou WAV, até 20 MB.");
      return;
    }
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
    const { error } = await supabase.storage
      .from("soundtracks")
      .upload(path, file, { contentType: file.type });
    if (error) {
      setMessage("Não foi possível enviar a música.");
      setBusy(false);
      return;
    }
    const next = { ...content, audioPath: path, audioName: file.name };
    const { error: saveError } = await supabase
      .from("site_settings")
      .update({ content: next })
      .eq("id", 1);
    if (saveError) {
      await supabase.storage.from("soundtracks").remove([path]);
      setMessage("Não foi possível ativar a música.");
    } else {
      if (content.audioPath)
        await supabase.storage.from("soundtracks").remove([content.audioPath]);
      setContent(next);
      setMessage("Música atualizada.");
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
    if (error) setMessage("Não foi possível remover a música.");
    else {
      if (content.audioPath)
        await supabase.storage.from("soundtracks").remove([content.audioPath]);
      setContent(next);
      setMessage("Música removida.");
    }
    setBusy(false);
  }
  async function removeRsvp(id: string) {
    if (!supabase || busy || !window.confirm("Remover esta confirmação?"))
      return;
    setBusy(true);
    const { error } = await supabase.from("rsvps").delete().eq("id", id);
    if (error) setMessage("Não foi possível remover.");
    else {
      setRsvps(rsvps.filter((r) => r.id !== id));
      setMessage("Confirmação removida.");
    }
    setBusy(false);
  }
  const filtered = rsvps
    .filter((r) =>
      r.family_name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
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
  if (checking)
    return (
      <main className="admin-shell">
        <p>Carregando…</p>
      </main>
    );
  if (!authorized)
    return (
      <main className="admin-shell">
        <div className="admin-login">
          <p className="eyebrow">O livro de Vicente</p>
          <h2>Administração</h2>
          {!supabase ? (
            <p>
              Configure o Supabase para habilitar o acesso seguro ao painel.
              Consulte as instruções no README do projeto.
            </p>
          ) : (
            <form className="admin-form" onSubmit={login}>
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
            </form>
          )}
          <p role="status">{message}</p>
          <Link href="/">Voltar ao convite</Link>
        </div>
      </main>
    );
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>O livro de {content.name}</h1>
        </div>
        <div className="admin-toolbar">
          <a href="/" target="_blank" rel="noreferrer">
            Visualizar convite ↗
          </a>
          <button
            className="secondary"
            onClick={async () => {
              await supabase?.auth.signOut();
              setAuthorized(false);
              setPassword("");
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <nav className="admin-nav">
        {sections.map((s, i) => (
          <button
            key={s}
            onClick={() => {
              setTab(i);
              setMessage("");
            }}
            aria-pressed={tab === i}
          >
            {s}
          </button>
        ))}
      </nav>
      <p className="admin-status" role="status">
        {message}
      </p>
      {tab === 0 && (
        <>
          <h2>Uma história em preparação.</h2>
          <p className="admin-summary">{rsvps.length} famílias confirmadas</p>
          <p>
            Edite os capítulos, defina o encontro e escolha a trilha sonora.
          </p>
          {!content.date && (
            <p className="admin-status">
              Data, horário e endereço ainda precisam ser definidos.
            </p>
          )}
        </>
      )}
      {[1, 2, 4, 6].includes(tab) && (
        <form className="admin-form" onSubmit={save}>
          {tab === 1 && (
            <>
              {field("intro", "Página 1 — título")}
              {field("narrative", "Página 1 — narrativa", true)}
              {field("quote", "Página 2 — frase curta ou citação", true)}
              {field(
                "quoteAuthor",
                "Autoria (deixe vazio para texto da família)",
              )}
              {field("rsvpText", "Página 6 — convite à confirmação", true)}
              {field("closing", "Página final — encerramento", true)}
            </>
          )}
          {tab === 2 && (
            <>
              {field("date", "Data — ainda não definida", false, "date")}
              {field("time", "Horário — ainda não definido", false, "time")}
              {field("dateNote", "Texto complementar")}
              <label>
                Formato da data
                <select
                  value={content.dateFormat}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      dateFormat: e.target.value as Content["dateFormat"],
                    })
                  }
                >
                  <option value="long">Por extenso</option>
                  <option value="short">Dia e mês</option>
                </select>
              </label>
              {field("venue", "Nome do local")}
              {field("address", "Endereço — ainda não definido", true)}
            </>
          )}
          {tab === 6 && (
            <>
              {field("name", "Nome da criança")}
              {field("age", "Idade")}
              {field("title", "Tema / título")}
              {field("subtitle", "Subtítulo da capa")}
            </>
          )}
          {tab === 4 && (
            <>
              <p>
                Música ativa: {content.audioName || "Nenhum arquivo enviado"}
              </p>
              <label>
                Enviar / substituir música
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
                  disabled={busy}
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              {content.audioPath && (
                <>
                  <audio
                    className="admin-audio"
                    controls
                    src={
                      supabase?.storage
                        .from("soundtracks")
                        .getPublicUrl(content.audioPath).data.publicUrl
                    }
                  />
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={removeAudio}
                  >
                    Remover música
                  </button>
                </>
              )}
              <label>
                Volume padrão — {Math.round(content.volume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={content.volume}
                  onChange={(e) =>
                    setContent({ ...content, volume: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}
          <button disabled={busy}>
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}
      {tab === 3 && (
        <div className="admin-form">
          {content.gifts.map((g, i) => (
            <div className="admin-gift" key={g.id}>
              <label>
                Sugestão
                <input
                  value={g.name}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      gifts: content.gifts.map((x) =>
                        x.id === g.id ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Descrição
                <textarea
                  value={g.detail}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      gifts: content.gifts.map((x) =>
                        x.id === g.id ? { ...x, detail: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={g.active}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      gifts: content.gifts.map((x) =>
                        x.id === g.id ? { ...x, active: e.target.checked } : x,
                      ),
                    })
                  }
                />
                Visível no convite
              </label>
              <div className="admin-gift-actions">
                <button
                  disabled={i === 0}
                  onClick={() => {
                    const gifts = [...content.gifts];
                    [gifts[i - 1], gifts[i]] = [gifts[i], gifts[i - 1]];
                    setContent({ ...content, gifts });
                  }}
                >
                  Subir
                </button>
                <button
                  disabled={i === content.gifts.length - 1}
                  onClick={() => {
                    const gifts = [...content.gifts];
                    [gifts[i + 1], gifts[i]] = [gifts[i], gifts[i + 1]];
                    setContent({ ...content, gifts });
                  }}
                >
                  Descer
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    setContent({
                      ...content,
                      gifts: content.gifts.filter((x) => x.id !== g.id),
                    })
                  }
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          <button
            className="secondary"
            onClick={() =>
              setContent({
                ...content,
                gifts: [
                  ...content.gifts,
                  {
                    id: crypto.randomUUID(),
                    name: "Nova sugestão",
                    detail: "",
                    active: true,
                  },
                ],
              })
            }
          >
            Adicionar sugestão
          </button>
          <button disabled={busy} onClick={() => void save()}>
            Salvar alterações
          </button>
        </div>
      )}
      {tab === 5 && (
        <>
          <div className="admin-toolbar">
            <input
              className="admin-search"
              aria-label="Pesquisar família"
              placeholder="Pesquisar família"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Ordenar confirmações"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome da família</option>
            </select>
            <button onClick={csv}>Exportar CSV</button>
            <button className="secondary" onClick={() => void load()}>
              Atualizar
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Família</th>
                <th>Data e horário</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.family_name}</td>
                  <td>
                    {new Date(r.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Fortaleza",
                    })}
                  </td>
                  <td>Confirmada</td>
                  <td>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => void removeRsvp(r.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p>Nenhuma confirmação encontrada.</p>}
        </>
      )}
    </main>
  );
}
