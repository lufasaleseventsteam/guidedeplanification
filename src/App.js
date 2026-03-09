import React, { useState, useEffect } from "react";
import { uid } from "./helpers";
import { loadEvents, saveEvents } from "./storage"; // kept as fallback
import { saveToDrive, loadEventsFromDrive, saveEventsToDrive } from "./googleDrive";
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
  const [driveResult, setDriveResult] = useState(null); // { name, shareLink, fileName, blob, mimeType }
  const [loading,    setLoading]    = useState(true);

  // Load events from Drive on login — deferred so login session is not disturbed
  const [driveLoaded, setDriveLoaded] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    // Always load from localStorage first — instant, no OAuth needed
    setEvents(loadEvents());
    setLoading(false);
  }, [user]);

  // Sync from Drive once, 2 seconds after login, so OAuth popup doesn't interfere with login
  useEffect(() => {
    if (!user || driveLoaded) return;
    const timer = setTimeout(() => {
      setDriveSyncing(true);
      loadEventsFromDrive()
        .then(evs => {
          if (evs.length > 0) {
            setEvents(evs);
            saveEvents(evs);
          }
          setDriveLoaded(true);
          setDriveSyncing(false);
        })
        .catch(() => { setDriveLoaded(true); setDriveSyncing(false); });
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, driveLoaded]);

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
    let updated;
    if (editingId) {
      updated = events.map(e => e.id === editingId ? { ...form, id: editingId, updatedAt: Date.now() } : e);
    } else {
      updated = [{ ...form, id: `evt-${uid()}`, createdAt: Date.now(), updatedAt: Date.now() }, ...events];
    }
    await persist(updated);
    setEditingId(null);
    setView(detailId ? "detail" : "list");
  };

  const handleDelete = async id => {
    await persist(events.filter(e => e.id !== id));
    setDetailId(null);
    setView("list");
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

  const handleImport = imported => {
    setEvents(imported);
    setView("list");
  };

  // ── Drive result modal ────────────────────────────────────────────────────
  const DriveModal = () => driveResult ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#1a2b1c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 28, maxWidth: 380, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: "#e8f0e9" }}>Guide sauvegardé!</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>{driveResult.name}</div>

        {/* Share link */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <input readOnly value={driveResult.shareLink}
            style={{ flex: 1, background: "none", border: "none", color: "#7dc494", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "text" }} />
          <button onClick={() => { navigator.clipboard.writeText(driveResult.shareLink); }}
            style={{ background: "rgba(74,124,89,0.3)", border: "none", borderRadius: 6, color: "#7dc494", padding: "5px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            📋 Copier
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={driveResult.shareLink} target="_blank" rel="noopener noreferrer"
            style={{ padding: "10px 18px", background: "linear-gradient(135deg, #6aaa80, #4a7c59)", borderRadius: 9, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            📂 Ouvrir dans Drive
          </a>
          <button onClick={() => saveAs(driveResult.blob, driveResult.fileName)}
            style={{ padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>
            ⬇️ Télécharger aussi
          </button>
        </div>
        <button onClick={() => setDriveResult(null)}
          style={{ marginTop: 16, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
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
        initial={editingId ? events.find(e => e.id === editingId) : null}
        isEdit={!!editingId}
        onSave={handleSave}
        onCancel={() => { setEditingId(null); setView(detailId ? "detail" : "list"); }}
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
      />
    </>
  );
}
