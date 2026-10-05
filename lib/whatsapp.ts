/** Longest `wa.me` link we trust: browsers and WhatsApp truncate beyond this. */
export const WHATSAPP_LINK_LIMIT = 6000;

type Message = {
  /** Name shown in the heading, e.g. the guest of honour. */
  title: string;
  families: string[];
  /** When the list was read; shown so a stale forward is recognisable. */
  updatedAt: Date;
};

/** One line per family: a name with line breaks would break the numbering. */
function clean(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

/**
 * The RSVP list as a WhatsApp message (`*bold*` is WhatsApp's own markup).
 * Takes the families in the order the admin is looking at them.
 */
export function rsvpWhatsAppText({ title, families, updatedAt }: Message) {
  const names = families.map(clean).filter(Boolean);
  // Date and time apart: the joiner between them varies across ICU versions.
  const zone = { timeZone: "America/Fortaleza" };
  const day = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...zone });
  const hour = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", ...zone });
  const stamp = `${day.format(updatedAt)} às ${hour.format(updatedAt)}`;
  const summary =
    names.length === 1
      ? "1 família confirmada"
      : `${names.length} famílias confirmadas`;
  return [
    `*Confirmações de presença — ${clean(title)}*`,
    `${summary} (atualizado em ${stamp})`,
    "",
    ...names.map((name, i) => `${i + 1}. ${name}`),
  ].join("\n");
}

/** `wa.me` without a number opens WhatsApp's own "choose a chat" screen. */
export function whatsAppLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function fitsWhatsAppLink(text: string) {
  return whatsAppLink(text).length <= WHATSAPP_LINK_LIMIT;
}
