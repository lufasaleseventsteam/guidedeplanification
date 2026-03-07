import React from "react";
import { DAY_TYPES, inp, PALETTE } from "../constants";
import { blankRow } from "../helpers";
import { Fld, Lbl, Sel, Inp } from "./UI";

export default function DayEditor({ day, onChange, onRemove, index }) {
  const set = k => v => onChange({ ...day, [k]: v });
  const isTravel = day.type === "travel_depart" || day.type === "travel_return";
  const isAnimation = day.type === "animation";

  const updateRow = (rowId, key, val) =>
    onChange({ ...day, rows: day.rows.map(r => r.id === rowId ? { ...r, [key]: val } : r) });
  const addRow    = () => onChange({ ...day, rows: [...(day.rows || []), blankRow()] });
  const removeRow = id => onChange({ ...day, rows: day.rows.filter(r => r.id !== id) });

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>

      {/* Day header row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${PALETTE.green}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: PALETTE.greenLight, flexShrink: 0, marginTop: 18 }}>
          J{index + 1}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Fld label="Type de journée" style={{ marginBottom: 0 }}>
            <Sel value={day.type} onChange={set("type")} options={DAY_TYPES} />
          </Fld>
          <Fld label="Date" style={{ marginBottom: 0 }}>
            <input type="date" value={day.date || ""} onChange={e => set("date")(e.target.value)} style={inp} />
          </Fld>
          {day.type === "custom" && (
            <Fld label="Titre personnalisé" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
              <Inp value={day.customLabel} onChange={set("customLabel")} placeholder="ex: Répétition, Formation..." />
            </Fld>
          )}
          {isAnimation && (
            <Fld label="🎯 Objectif inscriptions (cette journée)" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
              <Inp value={day.signupObjective || ""} onChange={set("signupObjective")} placeholder="ex: 50 inscriptions (optionnel)" />
            </Fld>
          )}
        </div>
        <button onClick={onRemove} style={{ background: "rgba(239,83,80,0.18)", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 6, color: "#ef9a9a", padding: "8px 12px", cursor: "pointer", fontSize: 12, flexShrink: 0, marginTop: 16, fontWeight: 700, fontFamily: "inherit" }}>🗑 Supprimer</button>
      </div>

      {/* Travel fields */}
      {isTravel ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Fld label="Heure de départ"  style={{ marginBottom: 0 }}><input type="time" value={day.departureTime || ""} onChange={e => set("departureTime")(e.target.value)} style={inp} /></Fld>
          <Fld label="Heure d'arrivée" style={{ marginBottom: 0 }}><input type="time" value={day.arrivalTime   || ""} onChange={e => set("arrivalTime")(e.target.value)}   style={inp} /></Fld>
          <Fld label="Note transport"  style={{ marginBottom: 0 }}><Inp value={day.transportNote || ""} onChange={set("transportNote")} placeholder="ex: Vol MTL→QC" /></Fld>
        </div>

      ) : (
        /* Schedule rows */
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 2fr auto", gap: 6, marginBottom: 5 }}>
            <Lbl>De</Lbl><Lbl>À</Lbl><Lbl>Lieu</Lbl><Lbl>Activité</Lbl><div />
          </div>
          {(day.rows || []).map(row => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 2fr auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <input type="time" value={row.timeStart || ""} onChange={e => updateRow(row.id, "timeStart", e.target.value)} style={inp} />
              <input type="time" value={row.timeEnd   || ""} onChange={e => updateRow(row.id, "timeEnd",   e.target.value)} style={inp} />
              <Inp value={row.location || ""} onChange={v => updateRow(row.id, "location", v)} placeholder="Événement" />
              <Inp value={row.activity || ""} onChange={v => updateRow(row.id, "activity", v)} placeholder="ex: Montage" />
              <button onClick={() => removeRow(row.id)} style={{ background: "rgba(239,83,80,0.1)", border: "none", borderRadius: 6, color: "#ef9a9a", padding: "7px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button onClick={addRow} style={{ background: "rgba(74,124,89,0.15)", border: `1px dashed rgba(74,124,89,0.4)`, borderRadius: 7, color: PALETTE.greenLight, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, width: "100%", marginTop: 4 }}>
            + Ajouter une ligne
          </button>
        </>
      )}
    </div>
  );
}
