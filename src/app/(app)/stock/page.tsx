"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Product = {
  id: string;
  name: string;
  unit: string;
  stock: string;
  lowStockThreshold: string;
  category: { name: string };
};

const qty = (n: string) => String(Number(n));

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", delta: "", reason: "" });

  async function load() {
    try {
      const p = await api<Product[]>("/products");
      setProducts(p);
      if (p[0] && !form.productId) setForm((f) => ({ ...f, productId: p[0].id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adjust() {
    setError("");
    setSaving(true);
    try {
      await api("/stock", {
        method: "POST",
        body: JSON.stringify({
          productId: form.productId,
          delta: Number(form.delta),
          reason: form.reason,
        }),
      });
      setForm((f) => ({ ...f, delta: "", reason: "" }));
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
          <h1>Stock</h1>
          <p>Current levels, and manual corrections for breakage or miscounts.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Adjust stock"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="field">
              <label>Product</label>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Change (use minus for loss)</label>
              <input
                type="number"
                step="0.25"
                placeholder="e.g. -2.5 or 3"
                value={form.delta}
                onChange={(e) => setForm({ ...form, delta: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Reason</label>
              <input
                placeholder="breakage, recount…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <button className="btn" onClick={adjust} disabled={saving}>
            {saving ? "Saving…" : "Apply adjustment"}
          </button>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            A positive number adds stock; a negative number removes it. Steps of 0.25 are allowed.
          </p>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="right">In stock</th>
              <th className="right">Alert at</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No products yet.</td>
              </tr>
            ) : (
              products.map((p) => {
                const low = Number(p.stock) <= Number(p.lowStockThreshold);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category?.name}</td>
                    <td className="right num">
                      {qty(p.stock)} {p.unit}
                      {low && <span className="badge low" style={{ marginLeft: 8 }}>Low</span>}
                    </td>
                    <td className="right num">{qty(p.lowStockThreshold)}</td>
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
