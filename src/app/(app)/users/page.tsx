"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALESPERSON" | "STAFF";
  active: boolean;
  canEditSale: boolean;
  canCancelSale: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [meId, setMeId] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function load() {
    try {
      const [list, me] = await Promise.all([
        api<User[]>("/users"),
        api<{ user: { userId: string } | null }>("/auth/me"),
      ]);
      setRows(list);
      setMeId(me.user?.userId || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addSalesperson() {
    setError("");
    setSaving(true);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "SALESPERSON" }),
      });
      setForm({ name: "", email: "", password: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    try {
      await api(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function resetPassword(id: string) {
    const pw = window.prompt("Enter a new password for this account (at least 6 characters):");
    if (!pw) return;
    await patch(id, { password: pw });
    alert("Password updated.");
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setError("");
    try {
      await api(`/users/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Create and manage salesperson accounts.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add salesperson"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email (they log in with this)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <button className="btn" onClick={addSalesperson} disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </button>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Share the email and password with your salesperson. They can start selling right away; they won&apos;t see any cost or profit figures.
          </p>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Can edit/cancel sales</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No accounts yet.</td>
              </tr>
            ) : (
              rows.map((u) => {
                const isMe = u.id === meId;
                const isAdmin = u.role === "ADMIN";
                return (
                  <tr key={u.id}>
                    <td>{u.name}{isMe && <span className="muted"> (you)</span>}</td>
                    <td className="num">{u.email}</td>
                    <td>{isAdmin ? "Administrator" : "Salesperson"}</td>
                    <td>
                      <span className={`badge ${u.active ? "paid" : "unpaid"}`}>
                        {u.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <span className="muted">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          style={{ width: "auto" }}
                          checked={u.canEditSale && u.canCancelSale}
                          onChange={(e) =>
                            patch(u.id, { canEditSale: e.target.checked, canCancelSale: e.target.checked })
                          }
                        />
                      )}
                    </td>
                    <td className="right">
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button className="btn ghost" onClick={() => resetPassword(u.id)}>Reset password</button>
                        {!isMe && (
                          <button className="btn ghost" onClick={() => patch(u.id, { active: !u.active })}>
                            {u.active ? "Disable" : "Enable"}
                          </button>
                        )}
                        {!isMe && !isAdmin && (
                          <button className="btn ghost" onClick={() => remove(u.id, u.name)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
