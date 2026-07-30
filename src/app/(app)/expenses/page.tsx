"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Expense = {
  id: string;
  title: string;
  amount: string;
  category: string;
  note: string | null;
  createdAt: string;
};

const cedis = (n: string | number) =>
  `GHS ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "General", note: "" });

  async function load() {
    try {
      setRows(await api<Expense[]>("/expenses"));
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
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setForm({ title: "", amount: "", category: "General", note: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p>Money going out — rent, transport, bills.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add expense"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="field">
              <label>Note (optional)</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <button className="btn" onClick={add} disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No expenses recorded yet.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.category}</td>
                  <td className="num">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="right num">{cedis(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tbody>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>Total</td>
                <td className="right num" style={{ fontWeight: 700 }}>{cedis(total)}</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
