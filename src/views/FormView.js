import React, { useState, useRef } from "react";
import { PALETTE, inp } from "../constants";
import { blankDay, blankRow, uid, readFileAsDataURL, defaultForm } from "../helpers";
import DayEditor from "../components/DayEditor";
import { Inp, Txt, Fld, Card, SecTitle, Btn, BackBtn, PageWrap } from "../components/UI";

export default function FormView({ initial, onSave, onCancel, isEdit }) {
  const initForm = () => {
    if (initial) return { ...defaultForm, ...initial };
    // Default: 3 days — travel out, animation, travel back
    return {
      ...defaultForm,
      days: [
        { ...blankDay("travel_depart"), id: uid() },
        { ...blankDay("animation"),     id: uid(), rows: [blankRow("Montage"), blankRow("Animation"), blankRow("Démontage")] },
        { ...blankDay("travel_return"), id: uid() },
      ],
    };
  };

  const [form,   setForm]   = useState(initForm);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const updateDay = (id, val) => setForm(f => ({ ...f, days: f.days.map(d => d.id === id ? val : d) }));
  const removeDay = id        => setForm(f => ({ ...f, days: f.days.filter(d => d.id !== id) }));
  const addDay    = ()        => setForm(f => ({ ...f, days: [...f.days, { ...blankDay("animation"), id: uid(), rows: [blankRow()] }] }));

  const handleMapUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setForm(f => ({ ...f, mapImageData: dataUrl, mapImageName: file.name }));
  };

  const handleSave = async () => {
    if (!form.eventName.trim()) { setError("Le nom de l'événement est requis."); return; }
    setError(""); setSaving(true);
    try { await onSave(form); }
    catch (e) { setError("Erreur : " + e.message); setSaving(false); }
  };

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <BackBtn onClick={onCancel} />
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
          {isEdit ? "Modifier l'événement" : "Nouvel événement"}
        </h2>
      </div>

      {/* General info */}
      <Card>
        <SecTitle>Informations générales</SecTitle>
        <Fld label="Nom de l'événement">
          <Inp value={form.eventName} onChange={set("eventName")} placeholder="ex: Fête des semences – Pépinière Locas" />
        </Fld>
        <Fld label="Adresse principale (même pour tous les jours)">
          <Inp value={form.adresse} onChange={set("adresse")} placeholder="ex: 3254 Bd Sainte-Rose, Laval, QC H7P 4L7" />
        </Fld>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Fld label="Accès montage à partir de" style={{ marginBottom: 0 }}>
            <Inp value={form.montageAccesFrom} onChange={set("montageAccesFrom")} placeholder="ex: 7h00 AM" />
          </Fld>
          <Fld label="🎯 Objectif inscriptions – total événement" style={{ marginBottom: 0 }}>
            <Inp value={form.signupObjectiveTotal || ""} onChange={set("signupObjectiveTotal")} placeholder="ex: 150 inscriptions (optionnel)" />
          </Fld>
        </div>
      </Card>

      {/* Schedule */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SecTitle style={{ marginBottom: 0 }}>
            📅 Horaire — {form.days.length} jour{form.days.length !== 1 ? "s" : ""}
          </SecTitle>
          <Btn onClick={addDay} variant="subtle" small>+ Journée</Btn>
        </div>
        {form.days.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Aucune journée ajoutée. Cliquez sur "+ Journée" pour commencer.
          </div>
        )}
        {form.days.map((day, i) => (
          <DayEditor key={day.id} day={day} index={i}
            onChange={v => updateDay(day.id, v)}
            onRemove={() => removeDay(day.id)} />
        ))}
      </Card>

      {/* Contact */}
      <Card>
        <SecTitle>👤 Contact sur place</SecTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Fld label="Nom"><Inp value={form.contactNom} onChange={set("contactNom")} placeholder="ex: Stéphanie" /></Fld>
          <Fld label="Téléphone"><Inp value={form.contactTel} onChange={set("contactTel")} placeholder="ex: 438-502-0202" /></Fld>
          <Fld label="Réseau WiFi"><Inp value={form.wifi} onChange={set("wifi")} placeholder="ex: Pépinière invite" /></Fld>
          <Fld label="Mot de passe WiFi"><Inp value={form.wifiMdp} onChange={set("wifiMdp")} placeholder="ex: PepiniereL.ocas" /></Fld>
        </div>
      </Card>

      {/* Material */}
      <Card>
        <SecTitle>📦 Matériel</SecTitle>
        <Fld label="Matériel nécessaire (1 item par ligne)">
          <Txt value={form.materielNecessaire} onChange={set("materielNecessaire")} rows={6} />
        </Fld>
        <Fld label="Matériel fourni sur place (optionnel, 1 item par ligne)">
          <Txt value={form.materielFourni} onChange={set("materielFourni")} rows={3} placeholder="Optionnel..." />
        </Fld>
      </Card>

      {/* Map */}
      <Card>
        <SecTitle>🗺️ Plan d'accès</SecTitle>
        <Fld label="Instructions de montage">
          <Txt value={form.instructions} onChange={set("instructions")} rows={3} />
        </Fld>
        <Fld label="Carte / plan (image optionnelle)">
          <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed rgba(255,255,255,0.13)", borderRadius: 8, padding: "14px", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.18)" }}>
            {form.mapImageName
              ? <span style={{ color: PALETTE.greenLight, fontSize: 13 }}>✅ {form.mapImageName}</span>
              : <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>Cliquer pour ajouter une image de carte</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: "none" }} />
        </Fld>
      </Card>

      {/* Internal notes */}
      <Card style={{ background: "rgba(255,235,59,0.04)", border: "1px solid rgba(255,235,59,0.14)" }}>
        <SecTitle>🔒 Notes internes</SecTitle>
        <Fld label="Instructions ou remarques pour l'équipe (apparaissent en jaune dans le doc)">
          <Txt value={form.notesInternes} onChange={set("notesInternes")} rows={4}
            placeholder="ex: Contacter Stéphanie la veille, charger le matériel vendredi matin..." />
        </Fld>
      </Card>

      {error && (
        <div style={{ background: "rgba(239,83,80,0.13)", border: "1px solid rgba(239,83,80,0.28)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#ef9a9a", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 48 }}>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : isEdit ? "💾 Mettre à jour" : "💾 Sauvegarder l'événement"}
        </Btn>
        <Btn onClick={onCancel} variant="ghost">Annuler</Btn>
      </div>
    </PageWrap>
  );
}
