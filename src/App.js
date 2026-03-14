import React, { useState, useEffect } from "react";
import { uid } from "./helpers";
import { loadEvents, saveEvents } from "./storage";
import { saveToDrive, deleteDriveFile, loadEventsFromDrive, saveEventsToDrive, getMonthFolderUrl } from "./googleDrive";
import { generateDocx } from "./docxGenerator";
import { saveAs } from "file-saver";
import ListView   from "./views/ListView";
import FormView   from "./views/FormView";
import DetailView from "./views/DetailView";
import GoogleLogin from "./components/GoogleLogin";
import { getSavedSession, clearSession } from "./googleAuth";

export default function App() {
  const [user,               setUser]               = useState(() => getSavedSession());
  const [view,               setView]               = useState("list");
  const [events,             setEvents]             = useState([]);
  const [editingId,          setEditingId]          = useState(null);
  const [detailId,           setDetailId]           = useState(null);
  const [generating,         setGenerating]         = useState(null);
  const [driveResult,        setDriveResult]        = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [driveSyncing,       setDriveSyncing]       = useState(false);
  const [duplicateData,      setDuplicateData]      = useState(null);
  const [driveFolderLoading, setDriveFolderLoading] = useState(false);
  const [linkCopied,         setLinkCopied]         = useState(false);
  const [savingDoc,          setSavingDoc]          = useState(false);

  // Load from localStorage on login (instant, no OAuth)
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setEvents(loadEvents());
    setLoading(false);
  }, [user]);

  // ── Persist: save to localStorage + Drive ─────────────────────────────────
  const persist = async (updated) => {
    setEvents(updated);
    saveEvents(updated);
    try {
      // Merge with current Drive state before saving to avoid overwriting others' events
      const driveEvents = await loadEventsFromDrive();
      const mergedMap = {};
      // Start with Drive events as base
      for (const ev of driveEvents) mergedMap[ev.id] = ev;
      // Apply local updated events on top (local changes win for events we touched)
      for (const ev of updated) mergedMap[ev.id] = ev;
      // Resolve conflicts: for events edited by multiple users, keep the most recently modified
      const driveMap = {};
      for (const ev of driveEvents) driveMap[ev.id] = ev;
      const localIds = new Set(updated.map(e => e.id));
      const previousLocalIds = new Set(events.map(e => e.id));

      const merged = Object.values(mergedMap).filter(ev => {
        if (!localIds.has(ev.id) && previousLocalIds.has(ev.id)) return false; // deleted locally
        return true;
      }).map(ev => {
        // If event exists both locally and on Drive, keep the newer version
        const driveEv = driveMap[ev.id];
        const localEv = updated.find(e => e.id === ev.id);
        if (driveEv && localEv) {
          const driveTime = driveEv.updatedAt || 0;
          const localTime = localEv.updatedAt || 0;
          return localTime >= driveTime ? localEv : driveEv;
        }
        return ev;
      });
      await saveEventsToDrive(merged);
      // Update local state to reflect full merged list
      setEvents(merged);
      saveEvents(merged);
    } catch(e) { console.error("saveEventsToDrive:", e); }
  };

  // ── Sync from Drive ────────────────────────────────────────────────────────
  const handleDriveSync = async () => {
    setDriveSyncing(true);
    try {
      const evs = await loadEventsFromDrive();
      // Always trust Drive as source of truth — overwrites local
      setEvents(evs);
      saveEvents(evs);
    } catch(e) { console.error("Sync error:", e); }
    setDriveSyncing(false);
  };

  // ── Save form ──────────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    const savedId    = editingId || `evt-${uid()}`;
    const savedEvent = {
      ...form,
      id:        savedId,
      updatedAt: Date.now(),
      ...(!editingId ? { createdAt: Date.now() } : {}),
    };

    // 1. Persist event data immediately
    const updated = editingId
      ? events.map(e => e.id === editingId ? savedEvent : e)
      : [savedEvent, ...events];
    await persist(updated);

    // 2. Upload attachments + generate docx — stay on form until done
    setSavingDoc(true);
    try {
      const attachments = await Promise.all(
        (savedEvent.attachments || []).map(async att => {
          if (!att.file) return att;
          try {
            const blob  = att.file instanceof Blob ? att.file : new Blob([att.file], { type: att.type });
            const drive = await saveToDrive(blob, att.name, att.type);
            return { ...att, file: undefined, driveLink: drive.shareLink, fileId: drive.fileId };
          } catch(e) {
            console.error("Attachment upload failed:", att.name, e);
            return { ...att, file: undefined };
          }
        })
      );

      const eventWithAtts = { ...savedEvent, attachments };
      const result = await generateDocx(eventWithAtts);
      const drive  = await saveToDrive(result.blob, result.fileName, result.mimeType);

      const withLink = updated.map(e =>
        e.id === savedId ? { ...e, attachments, driveLink: drive.shareLink, driveFileId: drive.fileId } : e
      );
      await persist(withLink);

      setSavingDoc(false);
      // Show popup BEFORE navigating away
      setDriveResult({ ...drive, blob: result.blob, fileName: result.fileName, mimeType: result.mimeType });

    } catch(e) {
      setSavingDoc(false);
      console.error("Background Drive save failed:", e);
    }

    // Navigate back AFTER everything is done
    setEditingId(null);
    setDuplicateData(null);
    setView(detailId ? "detail" : "list");
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    // Delete the Drive doc file if we have its ID
    const ev = events.find(e => e.id === id);
    if (ev) {
      // Delete main doc
      if (ev.driveFileId) {
        try { await deleteDriveFile(ev.driveFileId); } catch(e) { console.error("Drive delete failed:", e); }
      } else if (ev.driveLink) {
        // Extract file ID from URL as fallback
        const match = ev.driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) try { await deleteDriveFile(match[1]); } catch(e) { console.error("Drive delete failed:", e); }
      }
      // Delete any attached files too
      for (const att of (ev.attachments || [])) {
        if (att.fileId) {
          try { await deleteDriveFile(att.fileId); } catch(e) { console.error("Attachment delete failed:", e); }
        } else if (att.driveLink) {
          const match = att.driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) try { await deleteDriveFile(match[1]); } catch(e) {}
        }
      }
    }
    await persist(events.filter(e => e.id !== id));
    setDetailId(null);
    setView("list");
  };

  // ── Regenerate doc manually ────────────────────────────────────────────────
  const handleGenerate = async (ev, format = "docx") => {
    setGenerating(ev.id);
    try {
      const result = await generateDocx(ev);
      const drive  = await saveToDrive(result.blob, result.fileName, result.mimeType);
      // Update driveLink on event
      const updated = events.map(e => e.id === ev.id ? { ...e, driveLink: drive.shareLink, driveFileId: drive.fileId } : e);
      await persist(updated);
      setDriveResult({ ...drive, blob: result.blob, fileName: result.fileName, mimeType: result.mimeType });
    } catch(e) {
      console.error("Generate error:", e);
      try {
        const result = await generateDocx(ev);
        saveAs(result.blob, result.fileName);
      } catch(e2) { alert("Erreur : " + e2.message); }
    }
    setGenerating(null);
  };

  // ── Open Drive month folder ────────────────────────────────────────────────
  const handleOpenDriveFolder = async () => {
    setDriveFolderLoading(true);
    try {
      const url = await getMonthFolderUrl();
      window.open(url, "_blank");
    } catch(e) { console.error("Drive folder error:", e); }
    setDriveFolderLoading(false);
  };

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = (ev) => {
    setDuplicateData({
      ...ev,
      id:          null,
      eventName:   `Copie de ${ev.eventName || ""}`,
      days:        (ev.days || []).map(d => ({ ...d, date: "" })),
      driveLink:   undefined,
      attachments: (ev.attachments || []).map(a => ({ ...a, driveLink: undefined, fileId: undefined })),
      createdAt:   undefined,
      updatedAt:   undefined,
    });
    setEditingId(null);
    setView("form");
  };

  // ── Copy link helper ───────────────────────────────────────────────────────
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Saving modal (loading state) ──────────────────────────────────────────
  const SavingModal = () => savingDoc ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#1a2b1c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 32, maxWidth: 340, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>📝</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f0e9", marginBottom: 6 }}>Création du guide...</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>Génération et sauvegarde sur Google Drive</div>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #4a7c59, #7dc494)",
            animation: "progress 2s ease-in-out infinite",
          }} />
        </div>
        <style>{`
          @keyframes progress {
            0%   { width: 5%;  margin-left: 0; }
            50%  { width: 60%; margin-left: 20%; }
            100% { width: 5%;  margin-left: 95%; }
          }
        `}</style>
      </div>
    </div>
  ) : null;

  // ── Drive result modal ─────────────────────────────────────────────────────
  const DriveModal = () => driveResult ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#1a2b1c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 28, maxWidth: 400, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: "#e8f0e9" }}>Guide sauvegardé sur Drive!</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>{driveResult.name}</div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, color: "#7dc494", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
            {driveResult.shareLink}
          </span>
          <button onClick={() => copyLink(driveResult.shareLink)}
            style={{ background: linkCopied ? "rgba(74,180,89,0.4)" : "rgba(74,124,89,0.3)", border: "none", borderRadius: 7, color: "#7dc494", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: 700 }}>
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
        <button onClick={() => { setDriveResult(null); setEditingId(null); setDuplicateData(null); setView(detailId ? "detail" : "list"); }}
          style={{ marginTop: 16, background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
          Fermer
        </button>
      </div>
    </div>
  ) : null;

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!user) return <GoogleLogin onLogin={session => setUser(session)} />;

  // ── Form view ──────────────────────────────────────────────────────────────
  if (view === "form") {
    const initial = editingId
      ? events.find(e => e.id === editingId)
      : duplicateData || null;
    return (
      <>
        <SavingModal />
        <DriveModal />
        <FormView
          key={editingId || "new"}
          initial={initial}
          isEdit={!!editingId}
          onSave={handleSave}
          onCancel={() => { setEditingId(null); setDuplicateData(null); setView(detailId ? "detail" : "list"); }}
        />
      </>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === "detail" && detailId) {
    const ev = events.find(e => e.id === detailId);
    if (!ev) { setView("list"); return null; }
    return (
      <>
        <SavingModal />
        <DriveModal />
        <DetailView
          ev={ev}
          onEdit={ev => { setEditingId(ev.id); setDuplicateData(null); setView("form"); }}
          onDelete={handleDelete}
          onBack={() => setView("list")}
          onGenerate={handleGenerate}
          generating={generating}
          onDuplicate={handleDuplicate}
        />
      </>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <>
      <SavingModal />
      <DriveModal />
      <ListView
        events={events}
        loading={loading}
        onNew={() => { setEditingId(null); setDuplicateData(null); setView("form"); }}
        onDelete={handleDelete}
        onDetail={ev => { setDetailId(ev.id); setView("detail"); }}
        onGenerate={handleGenerate}
        generating={generating}
        user={user}
        onSignOut={() => { clearSession(); setUser(null); }}
        driveSyncing={driveSyncing}
        onSync={handleDriveSync}
        onDriveFolder={handleOpenDriveFolder}
        driveFolderLoading={driveFolderLoading}
      />
    </>
  );
}
