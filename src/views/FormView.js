import React, { useState, useRef } from "react";
import { PALETTE, inp } from "../constants";
import { blankDay, blankActivity, uid, readFileAsDataURL, defaultForm } from "../helpers";
import DayEditor from "../components/DayEditor";
import { Inp, Txt, Fld, Card, SecTitle, Btn, BackBtn, PageWrap } from "../components/UI";

function ImageCard({ img, onChange, onRemove }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <img src={img.data} alt={img.name} style={{ width: 80, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Largeur dans le doc</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.greenLight }}>{img.width}%</span>
            </div>
            <input autoComplete="off" type="range" min={20} max={100} step={5} value={img.width}
              onChange={e => onChange({ ...img, width: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: PALETTE.greenLight, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>Petit</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>Pleine largeur</span>
            </div>
          </div>
        </div>
        <button onClick={onRemove} style={{ background: "rgba(239,83,80,0.15)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 6, color: "#ef9a9a", padding: "5px 9px", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

function AddressField({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="ex: 3254 Bd Sainte-Rose, Laval, QC H7P 4L7"
      autoComplete="off"
      style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, padding: "8px 12px", color: "#e8f0e9", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
    />
  );
}

export default function FormView({ initial, onSave, onCancel, isEdit }) {
  const initForm = () => {
    if (initial) return { ...defaultForm, ...initial, mapImages: initial.mapImages || [] };
    return {
      ...defaultForm,
      days: [
        { ...blankDay(), id: uid(), activities: [{ ...blankActivity("travel_depart"), id: uid() }] },
        { ...blankDay(), id: uid(), activities: [{ ...blankActivity("setup"), id: uid(), activityLabel: "Montage" }, { ...blankActivity("animation"), id: uid(), activityLabel: "Animation" }, { ...blankActivity("teardown"), id: uid(), activityLabel: "Démontage" }] },
        { ...blankDay(), id: uid(), activities: [{ ...blankActivity("travel_return"), id: uid() }] },
      ],
    };
  };

  const [form, setForm]     = useState(initForm);
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const updateDay = (id, val) => setForm(f => ({ ...f, days: f.days.map(d => d.id === id ? val : d) }));
  const removeDay = id => setForm(f => ({ ...f, days: f.days.filter(d => d.id !== id) }));
  const addDay = () => setForm(f => ({ ...f, days: [...f.days, { ...blankDay(), id: uid(), activities: [{ ...blankActivity("animation"), id: uid() }] }] }));

  const handleMapUpload = async e => {
    const files = Array.from(e.target.files);
    const loaded = await Promise.all(files.map(async file => ({
      id: uid(), data: await readFileAsDataURL(file), name: file.name, width: 100,
    })));
    setForm(f => ({ ...f, mapImages: [...(f.mapImages || []), ...loaded] }));
    e.target.value = "";
  };

  const updateImage = (id, val) => setForm(f => ({ ...f, mapImages: f.mapImages.map(i => i.id === id ? val : i) }));
  const removeImage = id => setForm(f => ({ ...f, mapImages: f.mapImages.filter(i => i.id !== id) }));

  const handleSave = async () => {
    if (!form.eventName.trim()) { setError("Le nom de l'événement est requis."); return; }
    setError(""); setSaving(true);
    try { await onSave(form); }
    catch (e) { setError("Erreur : " + e.message); setSaving(false); }
  };

  return (
    <PageWrap>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <BackBtn onClick={onCancel} />
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#e8f0e9" }}>
          {isEdit ? "Modifier l'événement" : "Nouvel événement"}
        </h2>
      </div>

      <Card>
        <SecTitle>Informations générales</SecTitle>
        <Fld label="Nom de l'événement">
          <Inp value={form.eventName} onChange={set("eventName")} placeholder="ex: Fête des semences – Pépinière Locas" />
        </Fld>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Fld label="Guide rempli par" style={{ marginBottom: 0 }}>
            <Inp value={form.createdBy || ""} onChange={set("createdBy")} placeholder="ex: Marie Tremblay" />
          </Fld>
          <Fld label="Événement réservé par" style={{ marginBottom: 0 }}>
            <Inp value={form.bookedBy || ""} onChange={set("bookedBy")} placeholder="ex: Jean Dupont" />
          </Fld>
        </div>

        {/* Performance metrics */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: PALETTE.greenLight, textTransform: "uppercase", marginBottom: 12 }}>
            Objectifs & performance
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Fld label="Objectif adhésions" style={{ marginBottom: 0 }}>
              <Inp value={form.signupObjectiveTotal || ""} onChange={set("signupObjectiveTotal")} placeholder="ex: 20" type="number" min="0" />
            </Fld>
            <Fld label="Coût de l'événement ($)" style={{ marginBottom: 0 }}>
              <Inp value={form.eventCost || ""} onChange={set("eventCost")} placeholder="ex: 2000" type="number" min="0" />
            </Fld>
            <Fld label="CPA (coût par adhésion)" style={{ marginBottom: 0 }}>
              <div style={{
                padding: "8px 12px", borderRadius: 7,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 13, fontWeight: 700,
                color: (() => {
                  const obj = parseFloat(form.signupObjectiveTotal);
                  const cost = parseFloat(form.eventCost);
                  if (!obj || !cost) return "rgba(255,255,255,0.25)";
                  const cpa = cost / obj;
                  return cpa <= 50 ? "#7dc494" : cpa <= 150 ? "#ffe082" : "#ef9a9a";
                })(),
              }}>
                {(() => {
                  const obj = parseFloat(form.signupObjectiveTotal);
                  const cost = parseFloat(form.eventCost);
                  if (!obj || !cost) return "—";
                  return `${(cost / obj).toFixed(2)} $`;
                })()}
              </div>
            </Fld>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            Entrez les données du Calcul d'Activations ici (optionnel)
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>📍 Lieu & logistique</SecTitle>
        <Fld label="Adresse principale">
          <AddressField value={form.adresse} onChange={set("adresse")} />
        </Fld>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Fld label="Numéro de kiosque / emplacement" style={{ marginBottom: 0 }}>
            <Inp value={form.boothNumber || ""} onChange={set("boothNumber")} placeholder="ex: Kiosque B-12, Allée 3" />
          </Fld>
          <Fld label="Véhicule" style={{ marginBottom: 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, cursor: "pointer" }}>
              <input autoComplete="off" type="checkbox" checked={form.camionElectrique || false} onChange={e => set("camionElectrique")(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: PALETTE.greenLight, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#e8f0e9" }}>⚡ Camion électrique requis</span>
            </label>
          </Fld>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SecTitle style={{ marginBottom: 0 }}>📅 Horaire — {form.days.length} jour{form.days.length !== 1 ? "s" : ""}</SecTitle>
          <Btn onClick={addDay} variant="subtle" small>+ Journée</Btn>
        </div>
        {form.days.length === 0 && (
          <div style={{ textAlign: "center", padding: "18px 0", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Aucune journée. Cliquez sur "+ Journée" pour commencer.
          </div>
        )}
        {form.days.map((day, i) => (
          <DayEditor key={day.id} day={day} index={i}
            onChange={v => updateDay(day.id, v)}
            onRemove={() => removeDay(day.id)} />
        ))}
      </Card>

      <Card>
        <SecTitle>👤 Contact sur place</SecTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Fld label="Nom"><Inp value={form.contactNom} onChange={set("contactNom")} placeholder="ex: Stéphanie" /></Fld>
          <Fld label="Téléphone"><Inp value={form.contactTel} onChange={set("contactTel")} placeholder="ex: 438-502-0202" /></Fld>
          <Fld label="Réseau WiFi"><Inp value={form.wifi} onChange={set("wifi")} placeholder="ex: Pépinière invite" /></Fld>
          <Fld label="Mot de passe WiFi"><Inp value={form.wifiMdp} onChange={set("wifiMdp")} placeholder="ex: PepiniereL.ocas" /></Fld>
        </div>
      </Card>

      <Card>
        <SecTitle>📦 Matériel</SecTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "10px 14px", background: "rgba(74,124,89,0.1)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: "#e8f0e9", fontWeight: 600 }}>📋 Checklist matériel</span>
          <a href="https://lufasaleseventsteam.github.io/inventaire/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: PALETTE.greenLight, textDecoration: "none", fontWeight: 700, padding: "5px 12px", background: "rgba(74,124,89,0.2)", borderRadius: 6, border: "1px solid rgba(74,124,89,0.3)" }}>
            Ouvrir l'inventaire →
          </a>
        </div>
        <Fld label="Matériel nécessaire (1 item par ligne)">
          <Txt value={form.materielNecessaire} onChange={set("materielNecessaire")} rows={6} />
        </Fld>
        <Fld label="Matériel fourni sur place (optionnel)">
          <Txt value={form.materielFourni} onChange={set("materielFourni")} rows={3} placeholder="Optionnel..." />
        </Fld>
      </Card>

      <Card>
        <SecTitle>🗺️ Plan d'accès</SecTitle>
        <Fld label="Instructions de montage">
          <Txt value={form.instructions} onChange={set("instructions")} rows={3}
            placeholder="ex: Accéder au débarcadère pour déposer le matériel, puis se stationner dans les zones indiquées. Laisser vide si non applicable." />
        </Fld>
        <Fld label="Cartes / images (ajoutez-en autant que nécessaire)">
          {(form.mapImages || []).length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 8 }}>Aucune image ajoutée.</div>
          )}
          {(form.mapImages || []).map(img => (
            <ImageCard key={img.id} img={img} onChange={v => updateImage(img.id, v)} onRemove={() => removeImage(img.id)} />
          ))}
          <button onClick={() => fileRef.current.click()}
            style={{ width: "100%", background: "rgba(74,124,89,0.12)", border: "2px dashed rgba(74,124,89,0.4)", borderRadius: 8, padding: "12px", color: PALETTE.greenLight, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, marginTop: 4 }}>
            + Ajouter une ou plusieurs images
          </button>
          <input autoComplete="off" ref={fileRef} type="file" accept="image/*" multiple onChange={handleMapUpload} style={{ display: "none" }} />
        </Fld>
      </Card>

      <Card style={{ background: "rgba(255,235,59,0.04)", border: "1px solid rgba(255,235,59,0.14)" }}>
        <SecTitle>🔒 Notes internes</SecTitle>
        <Fld label="Remarques pour l'équipe (apparaissent en jaune dans le doc)">
          <Txt value={form.notesInternes} onChange={set("notesInternes")} rows={4}
            placeholder="ex: Contacter Stéphanie la veille, charger le matériel vendredi matin..." />
        </Fld>
      </Card>

      {error && (
        <div style={{ background: "rgba(239,83,80,0.13)", border: "1px solid rgba(239,83,80,0.28)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#ef9a9a", fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 48 }}>
        <Btn onClick={handleSave} disabled={saving}>{saving ? "Sauvegarde..." : isEdit ? "💾 Mettre à jour" : "💾 Sauvegarder l'événement"}</Btn>
        <Btn onClick={onCancel} variant="ghost">Annuler</Btn>
      </div>
    </PageWrap>
  );
}
