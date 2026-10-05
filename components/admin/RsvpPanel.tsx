"use client";
import Icon from "@/components/ui/Icon";
import { relativeTime } from "@/lib/admin";

export type Rsvp = {
  id: string;
  family_name: string;
  created_at: string;
  status: string;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });

export default function RsvpPanel({
  total,
  rows,
  search,
  onSearch,
  sort,
  onSort,
  busy,
  now,
  onRemove,
  onCsv,
  onWhatsapp,
  onCopyList,
  onRefresh,
  onCopyLink,
}: {
  total: number;
  rows: Rsvp[];
  search: string;
  onSearch: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  busy: boolean;
  now: Date;
  onRemove: (id: string, name: string) => void;
  onCsv: () => void;
  onWhatsapp: () => void;
  onCopyList: () => void;
  onRefresh: () => void;
  onCopyLink: () => void;
}) {
  const filtering = search.trim().length > 0;
  const none = rows.length === 0;
  return (
    <div className="admin-stack">
      <section className="admin-card">
        <header className="admin-card-head">
          <span className="admin-card-icon">
            <Icon name="users" size={18} />
          </span>
          <h3>
            {total} {total === 1 ? "família confirmada" : "famílias confirmadas"}
          </h3>
          {filtering && (
            <span className="admin-chip">
              mostrando {rows.length} de {total}
            </span>
          )}
        </header>
        <div className="admin-card-body">
          <div className="admin-toolbar">
            <label className="admin-search">
              <Icon name="search" size={16} />
              <input
                aria-label="Pesquisar família"
                placeholder="Pesquisar família"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Ordenar confirmações"
              value={sort}
              onChange={(e) => onSort(e.target.value)}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome da família</option>
            </select>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn whatsapp"
              onClick={onWhatsapp}
              disabled={none}
            >
              <Icon name="whatsapp" size={16} />
              Exportar por WhatsApp
            </button>
            <button type="button" className="admin-btn secondary" onClick={onCopyList} disabled={none}>
              <Icon name="copy" size={16} />
              Copiar lista
            </button>
            <button type="button" className="admin-btn secondary" onClick={onCsv} disabled={none}>
              <Icon name="download" size={16} />
              Exportar CSV
            </button>
            <button type="button" className="admin-btn ghost" onClick={onRefresh}>
              <Icon name="refresh" size={16} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {none ? (
        <section className="admin-card admin-emptycard">
          <Icon name={filtering ? "search" : "users"} size={28} />
          {filtering ? (
            <>
              <h3>Nenhuma família encontrada</h3>
              <p className="admin-muted">Nada corresponde a “{search.trim()}”.</p>
              <button type="button" className="admin-btn secondary small" onClick={() => onSearch("")}>
                Limpar pesquisa
              </button>
            </>
          ) : (
            <>
              <h3>Ainda não há confirmações</h3>
              <p className="admin-muted">
                Quando uma família confirmar pelo convite, ela aparece aqui. Compartilhe o link para
                começar.
              </p>
              <button type="button" className="admin-btn secondary small" onClick={onCopyLink}>
                <Icon name="copy" size={15} />
                Copiar link do convite
              </button>
            </>
          )}
        </section>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Família</th>
              <th>Confirmou em</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Família">{r.family_name}</td>
                <td data-label="Confirmou em">
                  {when(r.created_at)}
                  <span className="admin-muted"> · {relativeTime(r.created_at, now)}</span>
                </td>
                <td data-label="Status">
                  <span className="admin-pill">
                    <Icon name="check" size={13} />
                    Confirmada
                  </span>
                </td>
                <td className="admin-table-actions">
                  <button
                    type="button"
                    className="admin-btn danger small"
                    disabled={busy}
                    onClick={() => onRemove(r.id, r.family_name)}
                    aria-label={`Remover ${r.family_name}`}
                  >
                    <Icon name="trash" size={15} />
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
