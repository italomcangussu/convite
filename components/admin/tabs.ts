import type { IconName } from "@/components/ui/Icon";

/** Sections follow the order of the book, then the guest list. */
export type TabKey = "overview" | "cover" | "texts" | "event" | "gifts" | "music" | "rsvps";

export const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "overview", label: "Visão geral", icon: "dashboard" },
  { key: "cover", label: "Capa", icon: "star" },
  { key: "texts", label: "Textos", icon: "book" },
  { key: "event", label: "Data e local", icon: "calendar" },
  { key: "gifts", label: "Presentes", icon: "gift" },
  { key: "music", label: "Música", icon: "music" },
  { key: "rsvps", label: "Confirmações", icon: "users" },
];

/** Sections that edit the invitation text and share the "Salvar" bar. */
export const SAVEABLE: TabKey[] = ["cover", "texts", "event", "gifts", "music"];
