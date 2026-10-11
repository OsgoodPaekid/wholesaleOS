"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Note = {
  id: string;
  body: string;
  createdByName: string;
  createdAt: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [n, me] = await Promise.all([
        api<Note[]>("/notes"),
        api<{ user: { role: string } | null }>("/auth/me"),
      ]);
      setNotes(n);
      setIsAdmin(me.user?.role === "ADMIN");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api("/notes", { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      setBody("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this note?")) return;
    setError("");
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the note.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notes</h1>
          <p>A shared notepad for this shop. Everyone can add; only an admin can delete.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, maxWidth: 640 }}>
        <label htmlFor="note">New note</label>
        <textarea
          id="note"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write something down…"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            minHeight: 84,
            resize: "vertical",
          }}
        />
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={add} disabled={saving || !body.trim()}>
            {saving ? "Saving…" : "Add note"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {notes.length === 0 ? (
        <p className="muted">No notes yet. Add the first one above.</p>
      ) : (
        <div className="grid" style={{ maxWidth: 640 }}>
          {notes.map((n) => (
            <div key={n.id} className="card">
              <div style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>{n.body}</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span className="muted" style={{ fontSize: 12 }}>
                  {n.createdByName} · {new Date(n.createdAt).toLocaleString()}
                </span>
                {isAdmin && (
                  <button className="btn ghost" onClick={() => remove(n.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
