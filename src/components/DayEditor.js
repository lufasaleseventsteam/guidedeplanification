import React from "react";
import { DAY_TYPES, inp, PALETTE } from "../constants";
import { uid } from "../helpers";
import { Fld, Lbl, Sel, Inp } from "./UI";

// A single activity block within a day
function ActivityBlock({ act, onChange, onRemove, canRemove }) {
  const set = k => v => onChange({ ...act, [k]: v });
  const isTravel = act.type === "travel_depart" || act.type === "travel_return";
  const isAnimation = act.type === "animation";

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: isTravel ? 8 : 0 }}>
        {/* Activity type */}
        <div style={{ flex: 1 }}>
          <Sel value={act.type} onChange={set("type")} options={DAY_TYPES} />
        </div>
        {/* Custom label if needed */}
        {act.type === "custom" && (
          <div style={{ flex: 1 }}>
            <Inp value={act.customLabel || ""} onChange={set("customLabel")} placeholder="ex: Formation..." />
          </div>
        )}
        {canRemove && (
          <button onClick={onRemove} style={{ background: "rgba(239,83,80,0.15)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 6, color: "#ef9a9a", padding: "5px 8px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
        )}
      </div>

      {/* Travel: departure + arrival times */}
      {isTravel && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <Fld label="Départ" style={{ marginBottom: 0 }}>
            <input type="time" value={act.departureTime || ""} onChange={e => set("departureTime")(e.target.value)} style={inp} />
          </Fld>
          <Fld label="Arrivée" style={{ marginBottom: 0 }}>
            <input type="time" value={act.arrivalTime || ""} onChange={e => set("arrivalTime")(e.target.value)} style={inp} />
          </Fld>
          <Fld label="Note transport" style={{ marginBottom: 0 }}>
            <Inp value={act.transportNote || ""} onChange={set("transportNote")} placeholder="ex: Vol MTL→QC" />
          </Fld>
        </div>
      )}

      {/* Non-travel: time range + location + label */}
      {!isTravel && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <Fld label="De" style={{ marginBottom: 0 }}>
            <input type="time" value={act.timeStart || ""} onChange={e => set("timeStart")(e.target.value)} style={inp} />
          </Fld>
          <Fld label="À" style={{ marginBottom: 0 }}>
            <input type="time" value={act.timeEnd || ""} onChange={e => set("timeEnd")(e.target.value)} style={inp} />
          </Fld>
          <Fld label="Lieu" style={{ marginBottom: 0 }}>
            <Inp value={act.location || ""} onChange={set("location")} placeholder="Événement" />
          </Fld>
          <Fld label="Activité (optionnel)" style={{ marginBottom: 0 }}>
            <Inp value={act.activityLabel || ""} onChange={set("activityLabel")} placeholder="ex: Montage" />
          </Fld>
        </div>
      )}

      {/* Signup objective for animation */}
      {isAnimation && (
        <div style={{ marginTop: 8 }}>
          <Fld label="🎯 Objectif adhésions (cette animation)" style={{ marginBottom: 0 }}>
            <Inp value={act.signupObjective || ""} onChange={set("signupObjective")} placeholder="ex: 50 adhésions (optionnel)" />
          </Fld>
        </div>
      )}
    </div>
  );
}

function blankActivity(type = "animation") {
  return {
    id: uid(),
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

export default function DayEditor({ day, onChange, onRemove, index }) {
  const set = k => v => onChange({ ...day, [k]: v });

  const activities = day.activities || [];

  const updateActivity = (id, val) =>
    onChange({ ...day, activities: activities.map(a => a.id === id ? val : a) });
  const removeActivity = id =>
    onChange({ ...day, activities: activities.filter(a => a.id !== id) });
  const addActivity = () =>
    onChange({ ...day, activities: [...activities, blankActivity("animation")] });

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>

      {/* Day header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${PALETTE.green}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: PALETTE.greenLight, flexShrink: 0 }}>
          J{index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <Fld label="Date" style={{ marginBottom: 0 }}>
            <input type="date" value={day.date || ""} onChange={e => set("date")(e.target.value)} style={inp} />
          </Fld>
        </div>
        <button onClick={onRemove} style={{ background: "rgba(239,83,80,0.18)", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 6, color: "#ef9a9a", padding: "7px 12px", cursor: "pointer", fontSize: 12, flexShrink: 0, fontFamily: "inherit", fontWeight: 700 }}>
          🗑 Supprimer
        </button>
      </div>

      {/* Activities for this day */}
      {activities.length === 0 && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: "8px 0", marginBottom: 8 }}>
          Aucune activité. Ajoutez-en une ci-dessous.
        </div>
      )}
      {activities.map((act, i) => (
        <ActivityBlock
          key={act.id}
          act={act}
          onChange={v => updateActivity(act.id, v)}
          onRemove={() => removeActivity(act.id)}
          canRemove={activities.length > 1}
        />
      ))}

      <button onClick={addActivity}
        style={{ background: "rgba(74,124,89,0.15)", border: "1px dashed rgba(74,124,89,0.4)", borderRadius: 7, color: PALETTE.greenLight, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, width: "100%" }}>
        + Ajouter une activité à cette journée
      </button>
    </div>
  );
}
