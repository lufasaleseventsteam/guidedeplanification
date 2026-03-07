import React, { useState, useEffect } from "react";
import { uid } from "./helpers";
import { loadEvents, saveEvents } from "./storage";
import { generateDocx } from "./docxGenerator";
import ListView   from "./views/ListView";
import FormView   from "./views/FormView";
import DetailView from "./views/DetailView";
import PinLock    from "./components/PinLock";

const SESSION_KEY = "lufa-pin-unlocked";

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [view,       setView]       = useState("list");
  const [events,     setEvents]     = useState([]);
  const [editingId,  setEditingId]  = useState(null);
  const [detailId,   setDetailId]   = useState(null);
  const [generating, setGenerating] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setEvents(loadEvents());
    setLoading(false);
  }, []);

  const persist = updated => {
    setEvents(updated);
    saveEvents(updated);
  };

  const handleSave = form => {
    let updated;
    if (editingId) {
      updated = events.map(e => e.id === editingId ? { ...form, id: editingId, updatedAt: Date.now() } : e);
    } else {
      updated = [{ ...form, id: `evt-${uid()}`, createdAt: Date.now(), updatedAt: Date.now() }, ...events];
    }
    persist(updated);
    setEditingId(null);
    setView(detailId ? "detail" : "list");
  };

  const handleDelete = id => {
    persist(events.filter(e => e.id !== id));
    setDetailId(null);
    setView("list");
  };

  const handleGenerate = async ev => {
    setGenerating(ev.id);
    try { await generateDocx(ev); }
    catch(e) { alert("Erreur lors de la génération : " + e.message); }
    setGenerating(null);
  };

  const handleImport = imported => {
    setEvents(imported);
    setView("list");
  };

  // ── PIN gate ───────────────────────────────────────────────────────────────
  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

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
      <DetailView
        ev={ev}
        onEdit={ev => { setEditingId(ev.id); setView("form"); }}
        onDelete={handleDelete}
        onBack={() => setView("list")}
        onGenerate={handleGenerate}
        generating={generating}
      />
    );
  }

  return (
    <ListView
      events={events}
      loading={loading}
      onNew={() => { setEditingId(null); setView("form"); }}
      onDetail={ev => { setDetailId(ev.id); setView("detail"); }}
      onGenerate={handleGenerate}
      generating={generating}
      onImport={handleImport}
    />
  );
}
