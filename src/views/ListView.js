import React, { useRef } from "react";
import { PALETTE } from "../constants";
import { formatDateShort, getFirstDate } from "../helpers";
import { Btn, PageWrap } from "../components/UI";
import { exportData, importData } from "../storage";
import { LOGO_B64 } from "../logo_lufa";

export default function ListView({ events, onNew, onDetail, onGenerate, generating, loading, onImport }) {
  const importRef = useRef();
  const today     = new Date().toISOString().slice(0, 10);

  const sorted   = [...events].sort((a, b) => (getFirstDate(a) || "9999").localeCompare(getFirstDate(b) || "9999"));
  const upcoming = sorted.filter(e => !getFirstDate(e) || getFirstDate(e) >= today);
  const past     = sorted.filter(e =>  getFirstDate(e) && getFirstDate(e) <  today).reverse();

  const handleImportFile = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { const evs = await importData(file); onImport(evs); }
    catch(err) { alert("Erreur import : " + err.message); }
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
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        onMouseLeave={e => e.currentTarget.style.background = PALETTE.bgCard}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${PALETTE.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🌱</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#e8f0e9" }}>
            {ev.eventName}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {range} · {nbDays} jour{nbDays !== 1 ? "s" : ""}
            {ev.adresse ? ` · ${ev.adresse.split(",")[0]}` : ""}
            {hasObjective && <span style={{ color: "#ffe082", marginLeft: 6 }}>🎯</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Btn onClick={() => onGenerate(ev)} disabled={generating === ev.id} small>
            {generating === ev.id ? "⏳" : "⬇️"}
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <PageWrap>
      {/* Header with logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, paddingTop: 12 }}>
        <img src={LOGO_B64} alt="Les Fermes Lufa" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }} />
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#e8f0e9", marginBottom: 4 }}>
          Guide de Planification
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
          Les Fermes Lufa
        </div>
        <div style={{ marginTop: 20 }}>
          <Btn onClick={onNew}>+ Nouvel événement</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🗓️</div>
          <div style={{ color: "rgba(255,255,255,0.45)", marginBottom: 20, fontSize: 15 }}>Aucun événement pour l'instant.</div>
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
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
                Passés · {past.length}
              </div>
              {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${PALETTE.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Les Fermes Lufa · Guides de planification terrain</div>
        <div style={{ display: "flex", gap: 8 }}>
          {events.length > 0 && (
            <button onClick={exportData} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>↓ Exporter</button>
          )}
          <button onClick={() => importRef.current.click()} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>↑ Importer</button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
        </div>
      </div>
    </PageWrap>
  );
}
