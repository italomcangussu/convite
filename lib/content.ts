export type Gift = {
  id: string;
  name: string;
  detail: string;
  active: boolean;
};
export type Content = {
  name: string;
  age: string;
  title: string;
  subtitle: string;
  intro: string;
  narrative: string;
  quote: string;
  quoteAuthor: string;
  date: string;
  time: string;
  dateNote: string;
  dateFormat: "long" | "short";
  venue: string;
  address: string;
  gifts: Gift[];
  rsvpText: string;
  closing: string;
  audioPath: string;
  audioName: string;
  audioStartAt: number;
  volume: number;
};
export const defaults: Content = {
  name: "Vicente Mateus",
  age: "1 ano",
  title: "O Pequeno Príncipe",
  subtitle: "Uma pequena grande aventura",
  intro: "Há um ano, uma nova estrela iluminou o nosso universo.",
  narrative:
    "Agora, nosso pequeno príncipe convida você para celebrar seu primeiro ano. Uma história de amor, descobertas e muitos abraços.",
  quote: "Que a nossa próxima aventura seja ao lado de quem amamos.",
  quoteAuthor: "",
  date: "",
  time: "",
  dateNote: "Um dia para guardar no coração.",
  dateFormat: "long",
  venue: "Nosso ponto de encontro",
  address: "",
  gifts: [
    {
      id: "books",
      name: "Histórias para sonhar",
      detail: "Livros infantis para nossas próximas aventuras.",
      active: true,
    },
    {
      id: "toys",
      name: "Pequenas descobertas",
      detail: "Brinquedos adequados para 1 ano.",
      active: true,
    },
    {
      id: "hugs",
      name: "Seu carinho",
      detail: "A sua presença é o presente mais especial.",
      active: true,
    },
  ],
  rsvpText: "Esperamos sua família para viver essa aventura conosco.",
  closing: "Algumas estrelas brilham ainda mais quando estamos juntos.",
  audioPath: "",
  audioName: "",
  audioStartAt: 7.58,
  volume: 0.35,
};
export function maps(address: string) {
  const query = encodeURIComponent(address);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    waze: `https://www.waze.com/ul?q=${query}&navigate=yes`,
  };
}
export function displayDate(date: string, format: Content["dateFormat"]) {
  if (!date) return "Em breve";
  return new Intl.DateTimeFormat(
    "pt-BR",
    format === "short"
      ? { day: "2-digit", month: "2-digit" }
      : {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "America/Fortaleza",
        },
  ).format(new Date(date + "T12:00:00-03:00"));
}
