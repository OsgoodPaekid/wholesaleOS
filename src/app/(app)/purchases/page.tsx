"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Product = { id: string; name: string; unit: string };
type Supplier = { id: string; name: string };
type Line = { productId: string; quantity: string; unitCost: string };
type Purchase = {
  id: string;
  reference: string;
  total: string;
  createdAt: string;
  supplier: { name: string };
  items: { id: string }[];
};

const cedis = (n: string | number) =>
  `GHS ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [history, setHistory] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "", unitCost: "" }]);

  async function load() {
    try {
      const [p, s, h] = await Promise.all([
        api<Product[]>("/products"),
        api<Supplier[]>("/suppliers"),
        api<Purchase[]>("/purchases"),
      ]);
      setProducts(p);
      setSuppliers(s);
      setHistory(h);
      if (s[0]) setSupplierId((cur) => cur || s[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((cur) => [...cur, { productId: "", quantity: "", unitCost: "" }]);
  }
  function removeLine(i: number) {
    setLines((cur) => (cur.length === 1 ? cur : cur.filter((_, idx) => idx !== i)));
  }

  const formTotal = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
    0
  );
  const missingProduct = lines.some((l) => !l.productId);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api("/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitCost),
          })),
        }),
      });
      setLines([{ productId: "", quantity: "", unitCost: "" }]);
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
          <h1>Purchases</h1>
          <p>Record stock coming in. This raises stock and locks each item&apos;s cost.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "New purchase"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.length === 0 && <option value="">Add a supplier first</option>}
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <label style={{ marginTop: 6 }}>Items</label>
          {lines.map((l, i) => (
            <div key={i} className="line-row">
              <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input type="number" step="0.25" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <input type="number" step="0.01" placeholder="Unit cost" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
              <button className="btn ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}>✕</button>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button className="btn ghost" onClick={addLine}>+ Add item</button>
            <div className="num" style={{ fontWeight: 700 }}>Total: {cedis(formTotal)}</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={save} disabled={saving || !supplierId || missingProduct}>
              {saving ? "Saving…" : "Save purchase"}
            </button>
            {missingProduct && (
              <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>
                Choose a product for each item first.
              </span>
            )}
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Supplier</th>
              <th>Date</th>
              <th className="right">Items</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">No purchases yet.</td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="num">{h.reference}</td>
                  <td>{h.supplier?.name}</td>
                  <td className="num">{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td className="right num">{h.items.length}</td>
                  <td className="right num">{cedis(h.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
