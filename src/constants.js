export const DRIVE_LINKS = {
  mapaq:      "https://drive.google.com/file/d/1Ddybbl3Jgl_yk8oLMqk1jER88yqS4_4-/view?usp=drive_link",
  assurances: "https://drive.google.com/file/d/1oq27AHDdPeqPd8V3kOQcP13lVNWCRZ2B/view?usp=drive_link",
  cfia:       "https://drive.google.com/file/d/1REFnjPPUXt1FvdJQ7EcIVvdQ166GHtf8/view?usp=drive_link",
  chapiteau:  "https://drive.google.com/file/d/13GgkV359QNLmDHd16e9oAVrXkZ8ReykW/view?usp=drive_link",
};

export const DAY_TYPES = [
  { value: "travel_depart", label: "🚗 Voyage – Départ" },
  { value: "setup",         label: "🔧 Montage" },
  { value: "animation",     label: "🎉 Animation" },
  { value: "teardown",      label: "📦 Démontage" },
  { value: "travel_return", label: "🚗 Voyage – Retour" },
  { value: "custom",        label: "📋 Autre" },
];

export const DAY_TYPE_LABELS = Object.fromEntries(DAY_TYPES.map(d => [d.value, d.label]));

export const PALETTE = {
  green:      "#4a7c59",
  greenLight: "#6aaa80",
  greenDark:  "#2d5a3d",
  bg:         "#0f1a12",
  bgCard:     "rgba(255,255,255,0.04)",
  border:     "rgba(255,255,255,0.09)",
};

export const inp = {
  width: "100%",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 7,
  padding: "8px 12px",
  color: "#fff",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};
