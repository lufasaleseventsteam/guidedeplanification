import React, { useState, useEffect } from "react";
import { uid } from "./helpers";
import { loadEvents, saveEvents } from "./storage"; // kept as fallback
import { saveToDrive, loadEventsFromDrive, saveEventsToDrive, getMonthFolderUrl } from "./googleDrive";
import { generateDocx } from "./docxGenerator";
import { generatePdf }  from "./pdfGenerator";

import { saveAs }       from "file-saver";
import ListView   from "./views/ListView";
import FormView   from "./views/FormView";
import DetailView from "./views/DetailView";
import GoogleLogin from "./components/GoogleLogin";
import { getSavedSession, clearSession } from "./googleAuth";

export default function App() {
  const [user, setUser] = useState(() => getSavedSession());
  const [view,       setView]       = useState("list");
  const [events,     setEvents]     = useState([]);
  const [editingId,  setEditingId]  = useState(null);
  const [detailId,   setDetailId]   = useState(null);
  const [generating, setGenerating] = useState(null);
  const [driveResult, setDriveResult] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [driveFolderLoading, setDriveFolderLoading] = useState(false); // { name, shareLink, fileName, blob, mimeType }
  const [loading,    setLoading]    = useState(true);

  const [driveSyncing, setDriveSyncing] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [driveFolderLoading, setDriveFolderLoading] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setEvents(loadEvents());
    setLoading(false);
  }, [user]);

  const handleDriveSync = async () => {
    setDriveSyncing(true);
    try {
      const evs = await loadEventsFromDrive();
      if (evs.length > 0) {
        setEvents(evs);
        saveEvents(evs);
      }
    } catch(e) {
      console.error("Sync error:", e);
    }
    setDriveSyncing(false);
  };

  const persist = async updated => {
    setEvents(updated);
    saveEvents(updated); // keep localStorage as backup
    try {
      await saveEventsToDrive(updated);
    } catch(e) {
      console.error("saveEventsToDrive error:", e);
    }
  };

  const handleSave = async form => {
    const savedId = editingId || `evt-${uid()}`;
    const savedEvent = { ...form, id: savedId, updatedAt: Date.now(), ...(!editingId ? { createdAt: Date.now() } : {}) };
    let updated;
    if (editingId) {
      updated = events.map(e => e.id === editingId ? savedEvent : e);
    } else {
      updated = [savedEvent, ...events];
    }
    await persist(updated);
    setEditingId(null);
    setView(detailId ? "detail" : "list");

    // Auto-generate docx and upload to Drive
    try {
      const result = await generateDocx(savedEvent);
      const drive = await saveToDrive(result.blob, result.fileName, result.mimeType);
      // Store driveLink on the event
      const withLink = updated.map(e => e.id === savedId ? { ...e, driveLink: drive.shareLink } : e);
      await persist(withLink);
      setDriveResult({ ...drive, blob: result.blob, fileName: result.fileName, mimeType: result.mimeType });
    } catch(e) {
      console.error("Auto-save to Drive failed:", e);
    }
  };

  const handleDelete = async id => {
    await persist(events.filter(e => e.id !== id));
    setDetailId(null);
    setView("list");
  };

  const handleDuplicate = (ev) => {
    const copy = { ...ev, id: null, eventName: `Copie de ${ev.eventName}`, createdAt: Date.now(), updatedAt: Date.now() };
    setEditingId(null);
    // Pre-fill form with copied data
    setDuplicateData(copy);
    setView("form");
  };

  const handleGenerate = async (ev, format = "pdf") => {
    setGenerating(ev.id);
    try {
      const result = format === "docx" ? await generateDocx(ev) : await generatePdf(ev);
      // Upload to Google Drive
      const drive = await saveToDrive(result.blob, result.fileName, result.mimeType);
      setDriveResult({ ...drive, blob: result.blob, fileName: result.fileName, mimeType: result.mimeType });
    } catch(e) {
      // If Drive fails, fall back to local download
      console.error("Drive error:", e);
      alert("Erreur Google Drive : " + e.message + "\n\nLe fichier sera téléchargé localement.");
      try {
        const result = format === "docx" ? await generateDocx(ev) : await generatePdf(ev);
        saveAs(result.blob, result.fileName);
      } catch(e2) { alert("Erreur : " + e2.message); }
    }
    setGenerating(null);
  };

  const handleOpenDriveFolder = async () => {
    setDriveFolderLoading(true);
    try {
      const url = await getMonthFolderUrl();
      window.open(url, "_blank");
    } catch(e) {
      console.error("Drive folder error:", e);
    }
    setDriveFolderLoading(false);
  };

  const handleDuplicate = ev => {
    // Pre-fill form with copied data, clear dates, prefix name
    const copy = {
      ...ev,
      id: null,
      eventName: `Copie de ${ev.eventName || ""}`,
      days: (ev.days || []).map(d => ({ ...d, date: "" })),
      createdAt: undefined,
      updatedAt: undefined,
    };
    setEditingId(null);
    setDuplicateData(copy);
    setView("form");
  };

  const handleImport = imported => {
    setEvents(imported);
    setView("list");
  };

  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Drive result modal ────────────────────────────────────────────────────
  const DriveModal = () => driveResult ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#1a2b1c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 28, maxWidth: 400, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: "#e8f0e9" }}>Guide sauvegardé sur Drive!</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>{driveResult.name}</div>

        {/* Link copy row */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, color: "#7dc494", fontSize: 11, fontFamily: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
            {driveResult.shareLink}
          </span>
          <button onClick={() => copyLink(driveResult.shareLink)}
            style={{ background: linkCopied ? "rgba(74,180,89,0.4)" : "rgba(74,124,89,0.3)", border: "none", borderRadius: 7, color: "#7dc494", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: 700, transition: "background 0.2s" }}>
            {linkCopied ? "✓ Copié!" : "📋 Copier le lien"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <a href={driveResult.shareLink} target="_blank" rel="noopener noreferrer"
            style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6aaa80, #4a7c59)", borderRadius: 9, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            📂 Ouvrir
          </a>
          <button onClick={() => saveAs(driveResult.blob, driveResult.fileName)}
            style={{ padding: "10px 20px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 9, color: "#ccc", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>
            ⬇️ Télécharger
          </button>
        </div>
        <button onClick={() => setDriveResult(null)}
          style={{ marginTop: 16, background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
          Fermer
        </button>
      </div>
    </div>
  ) : null;

  // ── PIN gate ───────────────────────────────────────────────────────────────
  if (!user) return <GoogleLogin onLogin={session => setUser(session)} />;

  // ── Views ──────────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <FormView
        initial={editingId ? events.find(e => e.id === editingId) : duplicateData}
        isEdit={!!editingId}
        onSave={(form) => { setDuplicateData(null); handleSave(form); }}
        onCancel={() => { setEditingId(null); setDuplicateData(null); setView(detailId ? "detail" : "list"); }}
      />
    );
  }

  if (view === "detail" && detailId) {
    const ev = events.find(e => e.id === detailId);
    if (!ev) { setView("list"); return null; }
    return (
      <>
        <DriveModal />
        <DetailView
          ev={ev}
          onEdit={ev => { setEditingId(ev.id); setView("form"); }}
          onDelete={handleDelete}
          onBack={() => setView("list")}
          onGenerate={handleGenerate}
          generating={generating}
          onDuplicate={handleDuplicate}
        />
      </>
    );
  }

  return (
    <>
      <DriveModal />
      <ListView
        events={events}
        loading={loading}
        onNew={() => { setEditingId(null); setView("form"); }}
        onDetail={ev => { setDetailId(ev.id); setView("detail"); }}
        onGenerate={handleGenerate}
        generating={generating}
        onImport={handleImport}
        user={user}
        onSignOut={() => setUser(null)}
        driveSyncing={driveSyncing}
        onSync={handleDriveSync}
        onDriveFolder={handleOpenDriveFolder}
        driveFolderLoading={driveFolderLoading}
      />
    </>
  );
}
