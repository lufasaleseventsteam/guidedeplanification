import React, { useState } from "react";
import { DAY_TYPE_LABELS, PALETTE } from "../constants";
import { fmt24, formatDate, formatDateShort } from "../helpers";
import { Card, SecTitle, Btn, BackBtn, PageWrap, Lbl } from "../components/UI";

export default function DetailView({ ev, onEdit, onDelete, onBack, onGenerate, generating }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dates     = (ev.days || []).filter(d => d.date).map(d => d.date).sort();
  const dateRange = dates.length > 1
    ? `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
    : dates[0] ? formatDateShort(dates[0]) : "—";
  const nbDays    = ev.days?.length || 0;
  const animDays  = (ev.days || []).filter(d => d.type === "animation");

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
            {animDays.filter(d => d.signupObjective).map(d => (
              <div key={d.id} style={{ marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{formatDateShort(d.date)} : </span>
                <span style={{ color: "#ffe082" }}>{d.signupObjective}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card>
        <SecTitle>Horaire ({nbDays} jour{nbDays !== 1 ? "s" : ""})</SecTitle>
        {(ev.days || []).map((day, i) => {
          const isTravel = day.type === "travel_depart" || day.type === "travel_return";
          const label    = day.type === "custom" ? (day.customLabel || "Journée") : (DAY_TYPE_LABELS[day.type] || day.type);
          return (
            <div key={day.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < ev.days.length - 1 ? `1px solid ${PALETTE.border}` : "none", flexWrap: "wrap" }}>
              <div style={{ minWidth: 90, fontSize: 12, color: "rgba(255,255,255,0.38)", paddingTop: 2 }}>
                {formatDateShort(day.date)}
              </div>
              <div style={{ fontSize: 13, flex: 1 }}>
                <span style={{ fontWeight: 700, color: PALETTE.greenLight }}>{label}</span>
                {isTravel && (day.departureTime || day.arrivalTime) && (
                  <span style={{ color: "rgba(255,255,255,0.45)", marginLeft: 8 }}>
                    {day.departureTime ? `Départ ${fmt24(day.departureTime)}` : ""}
                    {day.departureTime && day.arrivalTime ? " → " : ""}
                    {day.arrivalTime   ? `Arrivée ${fmt24(day.arrivalTime)}`  : ""}
                    {day.transportNote ? ` (${day.transportNote})` : ""}
                  </span>
                )}
                {!isTravel && (day.rows || []).map((r, ri) => (
                  <span key={r.id} style={{ color: "rgba(255,255,255,0.45)", marginLeft: ri === 0 ? 8 : 14 }}>
                    {r.timeStart ? `${fmt24(r.timeStart)}–${fmt24(r.timeEnd)} ` : ""}
                    {r.activity}
                  </span>
                ))}
                {day.signupObjective && (
                  <span style={{ color: "#ffe082", marginLeft: 10, fontSize: 12 }}>🎯 {day.signupObjective}</span>
                )}
              </div>
            </div>
          );
        })}
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

      {/* Generate button */}
      <Btn onClick={() => onGenerate(ev)} disabled={generating === ev.id} full>
        {generating === ev.id ? "⏳ Génération en cours..." : "⬇️  Télécharger la fiche .docx"}
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
