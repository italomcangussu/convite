import type { Content } from "./content";

const ZONE = "America/Fortaleza";

export type Step = {
  id: "date" | "time" | "place" | "music";
  label: string;
  /** How the step reads once it is done. */
  doneLabel: string;
  done: boolean;
  /** Needed before sharing the invitation, or just recommended. */
  required: boolean;
};

/** What is still missing before the invitation can go out. */
export function readiness(content: Content): Step[] {
  return [
    {
      id: "date",
      label: "Definir a data da festa",
      doneLabel: "Data da festa definida",
      done: !!content.date,
      required: true,
    },
    {
      id: "time",
      label: "Definir o horário",
      doneLabel: "Horário definido",
      done: !!content.time,
      required: true,
    },
    {
      id: "place",
      label: "Informar o endereço",
      doneLabel: "Endereço informado",
      done: !!content.address.trim(),
      required: true,
    },
    {
      id: "music",
      label: "Escolher a música (recomendado)",
      doneLabel: "Música escolhida",
      done: !!content.audioPath,
      required: false,
    },
  ];
}

/** Whole days from today (in Fortaleza) to a `YYYY-MM-DD` date; null if unset. */
export function daysUntil(date: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(now);
  const utc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(date) - utc(today)) / 86_400_000);
}

/** "sábado, 12 de dezembro de 2026", or an empty string when unset. */
export function longDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONE,
  }).format(new Date(`${date}T12:00:00-03:00`));
}

/** Short, human "when": "agora há pouco", "há 5 min", "há 3 h", "ontem". */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  if (hours < 48) return "ontem";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: ZONE }).format(then);
}

/** Phrase for the countdown card. */
export function countdown(days: number | null): { value: string; note: string } {
  if (days === null) return { value: "A definir", note: "Escolha a data da festa" };
  if (days > 1) return { value: `${days} dias`, note: "para a festa" };
  if (days === 1) return { value: "Amanhã", note: "é a festa" };
  if (days === 0) return { value: "Hoje", note: "é a festa" };
  return { value: "Já passou", note: `há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}` };
}
