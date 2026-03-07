import React, { useRef } from "react";
import { PALETTE } from "../constants";
import { formatDateShort, getFirstDate } from "../helpers";
import { Btn, PageWrap } from "../components/UI";
import { exportData, importData } from "../storage";

export default function ListView({ events, onNew, onDetail, onGenerate, generating, loading, onImport }) {
  const importRef = useRef();
  const [formatPick, setFormatPick] = React.useState(null); // ev to generate
  const today     = new Date().toISOString().slice(0, 10);

  const sorted   = [...events].sort((a, b) => (getFirstDate(a) || "9999").localeCompare(getFirstDate(b) || "9999"));
  const upcoming = sorted.filter(e => !getFirstDate(e) || getFirstDate(e) >= today);
  const past     = sorted.filter(e =>  getFirstDate(e) && getFirstDate(e) <  today).reverse();

  const handleImportFile = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const events = await importData(file);
      onImport(events);
    } catch(err) { alert("Erreur import : " + err.message); }
    e.target.value = "";
  };

  const EventCard = ({ ev }) => {
    const dates = (ev.days || []).filter(d => d.date).map(d => d.date).sort();
    const range = dates.length > 1
      ? `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
      : dates[0] ? formatDateShort(dates[0]) : "—";
    const nbDays = ev.days?.length || 0;
    const hasObjective = ev.signupObjectiveTotal || (ev.days || []).some(d => d.signupObjective);

    return (
      <div onClick={() => onDetail(ev)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderRadius: 10, marginBottom: 7, cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = PALETTE.bgCard}>

        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${PALETTE.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
          🌱
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ev.eventName}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
            {range} · {nbDays} jour{nbDays !== 1 ? "s" : ""}
            {ev.adresse ? ` · ${ev.adresse.split(",")[0]}` : ""}
            {hasObjective && <span style={{ color: "#ffe082", marginLeft: 6 }}>🎯</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Btn onClick={() => setFormatPick(ev)} disabled={generating === ev.id} small>
            {generating === ev.id ? "⏳" : "⬇️"}
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg, ${PALETTE.greenLight}, ${PALETTE.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🌱
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>Fiches Événements</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Coordination terrain — Lufa Farms</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onNew}>+ Nouvel événement</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.28)" }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🗓️</div>
          <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 20, fontSize: 15 }}>Aucun événement pour l'instant.</div>
          <Btn onClick={onNew}>Créer le premier événement</Btn>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: PALETTE.greenLight, textTransform: "uppercase", marginBottom: 10 }}>
                À venir · {upcoming.length}
              </div>
              {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 10 }}>
                Passés · {past.length}
              </div>
              {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </>
      )}

      {/* Footer: export / import */}
      {/* Format picker modal */}
      {formatPick && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1a2a1b", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: 28, maxWidth: 320, textAlign: "center", width: "90%" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Choisir le format</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 20 }}>{formatPick.eventName}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
              <button onClick={() => { onGenerate(formatPick, "pdf");  setFormatPick(null); }}
                style={{ flex: 1, padding: "14px 10px", background: "linear-gradient(135deg, #6aaa80, #4a7c59)", border: "none", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📄 PDF
              </button>
              <button onClick={() => { onGenerate(formatPick, "docx"); setFormatPick(null); }}
                style={{ flex: 1, padding: "14px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📝 Word
              </button>
            </div>
            <button onClick={() => setFormatPick(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${PALETTE.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Lufa Farms · Fiches de coordination terrain
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {events.length > 0 && (
            <button onClick={exportData} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              ↓ Exporter
            </button>
          )}
          <button onClick={() => importRef.current.click()} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            ↑ Importer
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
        </div>
      </div>
    </PageWrap>
  );
}
