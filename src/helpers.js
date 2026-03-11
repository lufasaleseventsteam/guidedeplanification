export function fmt24(t) {
  if (!t || !String(t).trim()) return "";
  const s = String(t).trim().replace(/[hH]/, ":");
  const parts = s.split(":");
  const h = parts[0].padStart(2, "0");
  const m = (parts[1] || "00").replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  return `${h}h${m}`;
}

// Normalize time input to HH:MM for storage
export function normalizeTime(t) {
  if (!t || !String(t).trim()) return "";
  const s = String(t).trim().replace(/[hH]/, ":");
  const parts = s.split(":");
  const h = parts[0].replace(/\D/g, "").padStart(2, "0");
  const m = (parts[1] || "00").replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  if (!h || isNaN(parseInt(h))) return "";
  return `${h}:${m}`;
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


export function blankDay() {
  return {
    id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: "",
    activities: [blankActivity("animation")],
  };
}

export function blankActivity(type = "animation") {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    customLabel: "",
    departureTime: "",
    arrivalTime: "",
    transportNote: "",
    timeStart: "",
    timeEnd: "",
    location: "Événement",
    activityLabel: "",
    signupObjective: "",
  };
}

export const defaultForm = {
  eventName: "",
  createdBy: "",
  bookedBy: "",
  adresse: "",
  contactNom: "",
  contactTel: "",
  wifi: "",
  wifiMdp: "",
  signupObjectiveTotal: "",
  eventCost: "",             // cost of the event in $
  materielNecessaire: "CHARIOT\nTABLE\nNAPPE NOIRE 6'\nBANNIÈRE\nCAISSON DE BOIS\nSAVON + HUILE",
  materielFourni: "",
  instructions: "",
  notesInternes: "",
  mapImages: [],
  attachments: [],
  boothNumber: "",          // numéro de kiosque / emplacement
  camionElectrique: false,  // checkbox véhicule électrique
  isOutdoor: false,         // indoor vs outdoor event
  isRecurring: false,       // recurring event toggle
  recurringNote: "",        // ex: chaque samedi et dimanche
  isRecurring: false,       // recurring event — no dates needed
  days: [],
};
