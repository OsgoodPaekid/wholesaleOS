"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Party = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function SuppliersPage() {
  const [rows, setRows] = useState<Party[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  async function load() {
    try {
      setRows(await api<Party[]>("/suppliers"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    setSaving(true);
    try {
      await api("/suppliers", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", phone: "", email: "", address: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Suppliers</h1>
          <p>Businesses you buy stock from.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add supplier"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <button className="btn" onClick={add} disabled={saving}>
            {saving ? "Saving…" : "Save supplier"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No suppliers yet.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="num">{r.phone || "—"}</td>
                  <td>{r.email || "—"}</td>
                  <td>{r.address || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
