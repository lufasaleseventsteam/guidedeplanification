export function fmt24(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

export function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShort(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function getEventDateRange(ev) {
  const dates = (ev.days || []).filter(d => d.date).map(d => d.date).sort();
  return dates;
}

export function getFirstDate(ev) {
  return getEventDateRange(ev)[0] || "";
}

export function blankRow(label = "") {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timeStart: "",
    timeEnd: "",
    location: "Événement",
    activity: label,
  };
}

export function blankDay(type = "animation") {
  return {
    id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: "",
    type,
    customLabel: "",
    signupObjective: "",   // per-day signup goal (animation days only)
    rows: [],
    departureTime: "",
    arrivalTime: "",
    transportNote: "",
  };
}

export const defaultForm = {
  eventName: "",
  createdBy: "",          // person who filled the guide
  bookedBy: "",           // person who booked the event
  adresse: "",
  montageAccesFrom: "7h00 AM",
  contactNom: "",
  contactTel: "",
  wifi: "",
  wifiMdp: "",
  signupObjectiveTotal: "",
  materielNecessaire: "CHARIOT\nTABLE\nNAPPE NOIRE 6'\nBANNIÈRE\nCAISSON DE BOIS\nSAVON + HUILE",
  materielFourni: "",
  instructions: "Accéder au débarcadère dans un premier lieu afin de déposer le matériel et aller vous stationner dans les parties rouges. Le contact sur place vous indiquera l'emplacement de notre kiosque.",
  notesInternes: "",
  mapImages: [],          // array of { id, data, name, width } — replaces mapImageData/mapImageName
  days: [],
};
