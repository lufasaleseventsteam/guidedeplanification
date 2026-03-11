import React, { useRef, useState } from "react";
import { PALETTE } from "../constants";
import { formatDateShort, getFirstDate } from "../helpers";
import { Btn, PageWrap } from "../components/UI";
import { clearSession } from "../googleAuth";
import { LOGO_B64 } from "../logo_lufa.js";

export default function ListView({ events, onNew, onDetail, onGenerate, generating, loading, onImport, user, onSignOut, driveSyncing, onSync, onDriveFolder, driveFolderLoading }) {
  const today      = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");

  // Filter by search
  const filtered = events.filter(ev => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (ev.eventName || "").toLowerCase().includes(q) ||
      (ev.adresse   || "").toLowerCase().includes(q) ||
      (ev.bookedBy  || "").toLowerCase().includes(q) ||
      (ev.createdBy || "").toLowerCase().includes(q)
    );
  });

  const sorted   = [...filtered].sort((a, b) => (getFirstDate(a) || "9999").localeCompare(getFirstDate(b) || "9999"));
  const upcoming = sorted.filter(e => !getFirstDate(e) || getFirstDate(e) >= today);
  const past     = sorted.filter(e =>  getFirstDate(e) && getFirstDate(e) <  today).reverse();

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
          <Btn onClick={() => onGenerate(ev, "docx")} disabled={generating === ev.id} small>
            {generating === ev.id ? "⏳" : "⬇️"}
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <PageWrap>
      {/* Header with logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24, paddingTop: 12 }}>
        <img src={LOGO_B64} alt="Les Fermes Lufa" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }} />
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#e8f0e9", marginBottom: 4 }}>
          Guide de Planification
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
          Les Fermes Lufa
        </div>

        {/* User info + logout — always shown */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {user && user.picture && <img src={user.picture} alt={user.name} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)" }} />}
          {user && user.name && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{user.name}</span>}
          <button onClick={onDriveFolder} disabled={driveFolderLoading}
            style={{ background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: 6, color: PALETTE.greenLight, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "5px 12px" }}>
            {driveFolderLoading ? "⏳" : "📂 Drive"}
          </button>
          <button onClick={onSync} disabled={driveSyncing}
            style={{ background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: 6, color: PALETTE.greenLight, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
            {driveSyncing
              ? <><span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(125,196,148,0.3)", borderTopColor: PALETTE.greenLight, display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Sync...</>
              : "🔄 Sync"}
          </button>
          <button onClick={() => { clearSession(); onSignOut(); }}
            style={{ background: "rgba(239,83,80,0.15)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 6, color: "#ef9a9a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "5px 12px" }}>
            Déconnexion
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        <div style={{ marginTop: 16 }}>
          <Btn onClick={onNew}>+ Nouvel événement</Btn>
        </div>
      </div>

      {/* Search bar */}
      {events.length >= 0 && (
        <div style={{ marginBottom: 20, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement..."
            autoComplete="off"
            style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: "9px 12px 9px 36px", color: "#e8f0e9", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🗓️</div>
          <div style={{ color: "rgba(255,255,255,0.45)", marginBottom: 20, fontSize: 15 }}>Aucun événement pour l'instant.</div>
          <Btn onClick={onNew}>Créer le premier événement</Btn>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
          Aucun résultat pour « {search} »
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

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${PALETTE.border}`, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Les Fermes Lufa · Guides de planification terrain</div>
      </div>
    </PageWrap>
  );
}
