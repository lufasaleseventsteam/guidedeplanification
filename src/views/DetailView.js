import React, { useState } from "react";
import { DAY_TYPE_LABELS, PALETTE } from "../constants";
import { fmt24, formatDate, formatDateShort } from "../helpers";
import { Card, SecTitle, Btn, BackBtn, PageWrap, Lbl } from "../components/UI";

export default function DetailView({ ev, onEdit, onDelete, onBack, onGenerate, generating }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  const dates     = (ev.days || []).filter(d => d.date).map(d => d.date).sort();
  const dateRange = dates.length > 1
    ? `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
    : dates[0] ? formatDateShort(dates[0]) : "—";
  const nbDays    = ev.days?.length || 0;
  const animDays  = (ev.days || []).filter(d => (d.activities || []).some(a => a.type === "animation"));

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <BackBtn onClick={onBack} />
        <h2 style={{ fontSize: 18, fontWeight: 800, flex: 1, margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.eventName}
        </h2>
        <Btn onClick={() => onEdit(ev)} variant="ghost" small>✏️ Modifier</Btn>
        <Btn onClick={() => setConfirmDelete(true)} variant="danger" small>Supprimer</Btn>
      </div>

      {/* Summary */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            ["📅 Dates",           dateRange],
            ["📍 Adresse",          ev.adresse         || "—"],
            ["👤 Contact",         `${ev.contactNom || "—"}${ev.contactTel ? ` · ${ev.contactTel}` : ""}`],
            ["🔧 Accès montage",    ev.montageAccesFrom || "—"],
            ...(ev.boothNumber      ? [["🎪 Kiosque / emplacement", ev.boothNumber]]       : []),
            ...(ev.camionElectrique ? [["⚡ Véhicule",              "Camion électrique"]]  : []),
            ...(ev.createdBy ? [["📋 Guide rempli par",  ev.createdBy]] : []),
            ...(ev.bookedBy  ? [["📅 Réservé par",        ev.bookedBy]]  : []),
          ].map(([k, v]) => (
            <div key={k}><Lbl>{k}</Lbl><div style={{ fontSize: 14 }}>{v}</div></div>
          ))}
        </div>

        {/* Signup objective */}
        {(ev.signupObjectiveTotal || animDays.some(d => d.signupObjective)) && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,235,59,0.2)" }}>
            {ev.signupObjectiveTotal && (
              <div style={{ marginBottom: 8 }}>
                <Lbl>🎯 Objectif total</Lbl>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ffe082" }}>{ev.signupObjectiveTotal}</div>
              </div>
            )}
            {animDays.flatMap(d => (d.activities || []).filter(a => a.signupObjective).map(a => (
              <div key={a.id} style={{ marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{formatDateShort(d.date)} : </span>
                <span style={{ color: "#ffe082" }}>{a.signupObjective}</span>
              </div>
            )))}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card>
        <SecTitle>Horaire ({nbDays} jour{nbDays !== 1 ? "s" : ""})</SecTitle>
        {(ev.days || []).map((day, i) => (
          <div key={day.id} style={{ padding: "9px 0", borderBottom: i < ev.days.length - 1 ? `1px solid ${PALETTE.border}` : "none" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>{formatDateShort(day.date)}</div>
            {(day.activities || []).map(act => {
              const isTravel = act.type === "travel_depart" || act.type === "travel_return";
              const label = act.type === "custom" ? (act.customLabel || "Autre") : (DAY_TYPE_LABELS[act.type] || act.type);
              return (
                <div key={act.id} style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: PALETTE.greenLight, minWidth: 100 }}>{label}</span>
                  {isTravel ? (
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>
                      {act.departureTime ? `Départ ${fmt24(act.departureTime)}` : ""}
                      {act.departureTime && act.arrivalTime ? " → " : ""}
                      {act.arrivalTime ? `Arrivée ${fmt24(act.arrivalTime)}` : ""}
                      {act.transportNote ? ` (${act.transportNote})` : ""}
                    </span>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>
                      {act.timeStart ? `${fmt24(act.timeStart)}–${fmt24(act.timeEnd)}` : ""}
                      {act.activityLabel ? ` · ${act.activityLabel}` : ""}
                    </span>
                  )}
                  {act.signupObjective && <span style={{ color: "#ffe082", fontSize: 12 }}>🎯 {act.signupObjective}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      {/* Internal notes */}
      {ev.notesInternes && (
        <Card style={{ background: "rgba(255,235,59,0.05)", border: "1px solid rgba(255,235,59,0.18)" }}>
          <SecTitle>🔒 Notes internes</SecTitle>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", whiteSpace: "pre-line", lineHeight: 1.7 }}>
            {ev.notesInternes}
          </div>
        </Card>
      )}

      {/* Format picker */}
      {showFormat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1a2a1b", border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 28, maxWidth: 320, textAlign: "center", width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Choisir le format</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 22 }}>Dans quel format voulez-vous télécharger la fiche?</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
              <button onClick={() => { setShowFormat(false); onGenerate(ev, "pdf"); }}
                disabled={generating === ev.id}
                style={{ flex: 1, padding: "14px 10px", background: "linear-gradient(135deg, #6aaa80, #4a7c59)", border: "none", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📄 PDF
              </button>
              <button onClick={() => { setShowFormat(false); onGenerate(ev, "docx"); }}
                disabled={generating === ev.id}
                style={{ flex: 1, padding: "14px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📝 Word
              </button>
            </div>
            <button onClick={() => setShowFormat(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Generate button */}
      <Btn onClick={() => setShowFormat(true)} disabled={generating === ev.id} full>
        {generating === ev.id ? "⏳ Génération en cours..." : "⬇️  Télécharger la fiche"}
      </Btn>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1a2a1b", border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 28, maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Supprimer cet événement?</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 20 }}>
              Cette action est irréversible.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn onClick={() => onDelete(ev.id)} variant="danger">Supprimer</Btn>
              <Btn onClick={() => setConfirmDelete(false)} variant="ghost">Annuler</Btn>
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
