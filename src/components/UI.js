import React from "react";
import { PALETTE, inp } from "../constants";

export const Inp = ({ value, onChange, type = "text", placeholder, style = {} }) => (
  <input autoComplete="off" type={type} value={value || ""} placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={{ ...inp, ...style }} />
);

export const Sel = ({ value, onChange, options, style = {} }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ ...inp, ...style, cursor: "pointer" }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const Txt = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea autoComplete="off" value={value || ""} rows={rows} placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
);

export const Lbl = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase", marginBottom: 5 }}>
    {children}
  </div>
);

export const Fld = ({ label, children, style = {} }) => (
  <div style={{ marginBottom: 12, ...style }}>
    <Lbl>{label}</Lbl>
    {children}
  </div>
);

export const Card = ({ children, style = {} }) => (
  <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 14, ...style }}>
    {children}
  </div>
);

export const SecTitle = ({ children, style = {} }) => (
  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#7dc494", textTransform: "uppercase", marginBottom: 14, ...style }}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, disabled, variant = "primary", small, full }) => {
  const variants = {
    primary: { background: disabled ? "rgba(74,124,89,0.35)" : `linear-gradient(135deg, ${PALETTE.greenLight}, ${PALETTE.green})`, color: "#fff", border: "none" },
    ghost:   { background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.82)", border: "1px solid rgba(255,255,255,0.1)" },
    danger:  { background: "rgba(239,83,80,0.12)", color: "#ef9a9a", border: "1px solid rgba(239,83,80,0.22)" },
    subtle:  { background: "rgba(74,124,89,0.18)", color: PALETTE.greenLight, border: `1px solid rgba(74,124,89,0.3)` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant], borderRadius: small ? 7 : 9, fontFamily: "inherit",
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      padding: small ? "6px 12px" : "11px 18px", fontSize: small ? 12 : 13,
      letterSpacing: "0.02em", width: full ? "100%" : undefined,
    }}>
      {children}
    </button>
  );
};

export const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "rgba(255,255,255,0.07)", border: `1px solid ${PALETTE.border}`,
    borderRadius: 8, color: "rgba(255,255,255,0.55)", padding: "6px 14px",
    cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  }}>← Retour</button>
);

export const PageWrap = ({ children }) => (
  <div style={{
    minHeight: "100vh",
    background: `linear-gradient(160deg, #151f17 0%, #1a2b1c 60%, #142018 100%)`,
    fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#fff", padding: "24px 18px",
  }}>
    <div style={{ maxWidth: 740, margin: "0 auto" }}>{children}</div>
  </div>
);
