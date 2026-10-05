"use client";
import Icon, { type IconName } from "@/components/ui/Icon";
import type { Content } from "@/lib/content";
import { countdown, daysUntil, readiness, relativeTime } from "@/lib/admin";
import { whatsAppLink } from "@/lib/whatsapp";
import type { TabKey } from "./tabs";

type Rsvp = { id: string; family_name: string; created_at: string };

function Stat({
  icon,
  label,
  value,
  note,
  action,
  onAction,
}: {
  icon: IconName;
  label: string;
  value: string;
  note: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="admin-stat">
      <span className="admin-card-icon">
        <Icon name={icon} size={18} />
      </span>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-note">{note}</p>
      <button type="button" className="admin-link" onClick={onAction}>
        {action}
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}

/** First screen: what the invitation looks like today and what is missing. */
export default function Overview({
  content,
  rsvps,
  siteUrl,
  now,
  go,
  copyLink,
}: {
  content: Content;
  rsvps: Rsvp[];
  siteUrl: string;
  now: Date;
  go: (tab: TabKey) => void;
  copyLink: () => void;
}) {
  const steps = readiness(content);
  const missing = steps.filter((s) => s.required && !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  const timeLeft = countdown(daysUntil(content.date, now));
  const visibleGifts = content.gifts.filter((g) => g.active).length;
  const latest = rsvps[0];
  const shareText = `Você está convidado para a festa de ${content.name}! Abra o convite: ${siteUrl}`;
  const goTo: Record<string, TabKey> = {
    date: "event",
    time: "event",
    place: "event",
    music: "music",
  };

  return (
    <div className="admin-stack">
      <div className="admin-stats">
        <Stat
          icon="users"
          label="Confirmações"
          value={String(rsvps.length)}
          note={
            latest
              ? `${rsvps.length === 1 ? "família" : "famílias"} · última ${relativeTime(latest.created_at, now)}`
              : "Ninguém confirmou ainda"
          }
          action="Ver a lista"
          onAction={() => go("rsvps")}
        />
        <Stat
          icon="calendar"
          label="Festa"
          value={timeLeft.value}
          note={timeLeft.note}
          action={content.date ? "Alterar data" : "Definir data"}
          onAction={() => go("event")}
        />
        <Stat
          icon="music"
          label="Música"
          value={content.audioPath ? "Ativa" : "Sem música"}
          note={content.audioName || "O convite abre em silêncio"}
          action={content.audioPath ? "Ajustar" : "Escolher"}
          onAction={() => go("music")}
        />
        <Stat
          icon="gift"
          label="Presentes"
          value={String(visibleGifts)}
          note={visibleGifts === 1 ? "sugestão visível" : "sugestões visíveis"}
          action="Editar sugestões"
          onAction={() => go("gifts")}
        />
      </div>

      <section className="admin-card">
        <header className="admin-card-head">
          <span className="admin-card-icon">
            <Icon name={missing.length ? "alert" : "check"} size={18} />
          </span>
          <h3>{missing.length ? "O que falta para enviar o convite" : "Tudo pronto para enviar"}</h3>
          <span className="admin-chip">
            {doneCount} de {steps.length}
          </span>
        </header>
        <ul className="admin-steps">
          {steps.map((s) => (
            <li key={s.id} className={s.done ? "done" : ""}>
              <span className="admin-step-mark">
                <Icon name={s.done ? "check" : "circle"} size={s.done ? 15 : 18} />
              </span>
              <span className="admin-step-label">
                {s.done ? s.doneLabel : s.label}
              </span>
              {!s.done && (
                <button type="button" className="admin-link" onClick={() => go(goTo[s.id])}>
                  Preencher
                  <Icon name="arrowRight" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <header className="admin-card-head">
          <span className="admin-card-icon">
            <Icon name="link" size={18} />
          </span>
          <h3>Link do convite</h3>
        </header>
        <div className="admin-card-body">
          <div className="admin-linkbox">
            <input readOnly aria-label="Endereço do convite" value={siteUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="admin-actions">
            <button type="button" className="admin-btn secondary" onClick={copyLink}>
              <Icon name="copy" size={16} />
              Copiar link
            </button>
            <a
              className="admin-btn whatsapp"
              href={whatsAppLink(shareText)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="whatsapp" size={16} />
              Compartilhar no WhatsApp
            </a>
            <a className="admin-btn secondary" href="/" target="_blank" rel="noreferrer">
              <Icon name="external" size={16} />
              Ver convite
            </a>
          </div>
        </div>
      </section>

      {rsvps.length > 0 && (
        <section className="admin-card">
          <header className="admin-card-head">
            <span className="admin-card-icon">
              <Icon name="clock" size={18} />
            </span>
            <h3>Últimas confirmações</h3>
          </header>
          <ul className="admin-recent">
            {rsvps.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span>{r.family_name}</span>
                <span className="admin-muted">{relativeTime(r.created_at, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
