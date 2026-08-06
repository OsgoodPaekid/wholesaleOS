"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Product = { id: string; name: string; unit: string; sellingPrice: string; stock: string };
type Customer = { id: string; name: string };
type Line = { productId: string; quantity: string; unitPrice: string };
type Sale = {
  id: string;
  reference: string;
  subtotal: string;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  createdAt: string;
  customer: { name: string } | null;
  items: { id: string; quantity: string; product: { name: string } }[];
  voidedAt: string | null;
};
type Summary = { total: number; count: number };

const cedis = (n: string | number) =>
  `GHS ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "", unitPrice: "" }]);

  async function load() {
    try {
      const [p, c, h, s, me] = await Promise.all([
        api<Product[]>("/products"),
        api<Customer[]>("/customers"),
        api<Sale[]>("/sales"),
        api<Summary>("/sales/summary"),
        api<{ user: { role: string } | null }>("/auth/me"),
      ]);
      setProducts(p);
      setCustomers(c);
      setHistory(h);
      setSummary(s);
      setIsAdmin(me.user?.role === "ADMIN");
      if (p[0]) {
        setLines((cur) =>
          cur[0].productId ? cur : [{ productId: p[0].id, quantity: "", unitPrice: p[0].sellingPrice }]
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((cur) =>
      cur.map((l, idx) => {
        if (idx !== i) return l;
        const next = { ...l, ...patch };
        // When the product changes, prefill its selling price.
        if (patch.productId) {
          const p = products.find((x) => x.id === patch.productId);
          if (p) next.unitPrice = p.sellingPrice;
        }
        return next;
      })
    );
  }
  function addLine() {
    const p = products[0];
    setLines((cur) => [...cur, { productId: p?.id || "", quantity: "", unitPrice: p?.sellingPrice || "" }]);
  }
  function removeLine(i: number) {
    setLines((cur) => (cur.length === 1 ? cur : cur.filter((_, idx) => idx !== i)));
  }

  const formTotal = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api("/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || undefined,
          amountPaid: Number(amountPaid) || 0,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      setLines([{ productId: products[0]?.id || "", quantity: "", unitPrice: products[0]?.sellingPrice || "" }]);
      setAmountPaid("");
      setCustomerId("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function reverseSale(id: string, reference: string) {
    if (
      !window.confirm(
        `Reverse sale ${reference}? The stock will be returned and this sale will no longer count in your totals. It stays on record as "Reversed".`
      )
    )
      return;
    setError("");
    try {
      await api(`/sales/${id}/reverse`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reverse.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sales</h1>
          <p>Record what you sell. Stock drops from the oldest batch and profit is worked out for you.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "New sale"}
        </button>
      </div>

      {summary && (
        <div className="card stat" style={{ marginBottom: 16, maxWidth: 320 }}>
          <div className="label">Your sales today</div>
          <div className="value num">{cedis(summary.total)}</div>
          <div className="sub">
            {summary.count} sale{summary.count === 1 ? "" : "s"} so far today
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 640 }}>
            <div className="field">
              <label>Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Amount paid now</label>
              <input type="number" step="0.01" placeholder="0.00" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>
          </div>

          <label style={{ marginTop: 6 }}>Items</label>
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 8 }}>
                <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (have {Number(prod.stock)})
                    </option>
                  ))}
                </select>
                <input type="number" step="0.25" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <input type="number" step="0.01" placeholder="Unit price" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                <button className="btn ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}>✕</button>
                {p && Number(l.quantity) > Number(p.stock) && (
                  <p className="error" style={{ gridColumn: "1 / -1", margin: 0 }}>
                    Only {Number(p.stock)} {p.unit} of {p.name} in stock.
                  </p>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button className="btn ghost" onClick={addLine}>+ Add item</button>
            <div className="num" style={{ fontWeight: 700 }}>Total: {cedis(formTotal)}</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save sale"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Products</th>
              <th>Date</th>
              <th className="right">Total</th>
              <th>Status</th>
              {isAdmin && <th className="right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="muted">No sales yet.</td>
              </tr>
            ) : (
              history.map((s) => (
                <tr key={s.id} style={s.voidedAt ? { opacity: 0.55 } : undefined}>
                  <td className="num">{s.reference}</td>
                  <td>{s.customer?.name || "Walk-in"}</td>
                  <td>{s.items.map((it) => `${Number(it.quantity)} × ${it.product.name}`).join(", ")}</td>
                  <td className="num">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="right num">{cedis(s.subtotal)}</td>
                  <td>
                    {s.voidedAt ? (
                      <span className="badge low">Reversed</span>
                    ) : (
                      <span className={`badge ${s.paymentStatus.toLowerCase()}`}>{s.paymentStatus}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="right">
                      {s.voidedAt ? (
                        <span className="muted">—</span>
                      ) : (
                        <button className="btn ghost" onClick={() => reverseSale(s.id, s.reference)}>
                          Reverse
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
