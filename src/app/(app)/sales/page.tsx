"use client";

import { useEffect, useState, Fragment } from "react";
import { api } from "@/lib/client";

type Product = { id: string; name: string; unit: string; sellingPrice: string; stock: string };
type Customer = { id: string; name: string };
type Line = { productId: string; quantity: string; unitPrice: string };
type SaleItem = {
  id: string;
  quantity: string;
  lineTotal: string;
  product: { name: string };
  voidedAt: string | null;
};
type Sale = {
  id: string;
  reference: string;
  subtotal: string;
  amountPaid: string;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  createdAt: string;
  customer: { name: string } | null;
  items: SaleItem[];
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [paidInFull, setPaidInFull] = useState(true);
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
        if (patch.productId) {
          const p = products.find((x) => x.id === patch.productId);
          if (p) next.unitPrice = p.sellingPrice;
        }
        return next;
      })
    );
  }
  function addLine() {
    setLines((cur) => [...cur, { productId: "", quantity: "", unitPrice: "" }]);
  }
  function removeLine(i: number) {
    setLines((cur) => (cur.length === 1 ? cur : cur.filter((_, idx) => idx !== i)));
  }

  const formTotal = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );
  const missingProduct = lines.some((l) => !l.productId);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api("/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || undefined,
          paidInFull,
          amountPaid: Number(amountPaid) || 0,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      setLines([{ productId: "", quantity: "", unitPrice: "" }]);
      setAmountPaid("");
      setPaidInFull(true);
      setCustomerId("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(saleId: string) {
    const sale = history.find((s) => s.id === saleId);
    if (!sale) return;
    if (!window.confirm(`Mark sale ${sale.reference} as fully paid (${cedis(sale.subtotal)})?`)) return;
    setError("");
    try {
      await api(`/sales/${saleId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amountPaid: Number(sale.subtotal) }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update payment.");
    }
  }

  async function recordPayment(saleId: string) {
    const entered = window.prompt("Total amount paid on this sale so far:");
    if (entered === null) return;
    const n = Number(entered);
    if (Number.isNaN(n) || n < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setError("");
    try {
      await api(`/sales/${saleId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amountPaid: n }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update payment.");
    }
  }

  async function reverseItem(itemId: string, name: string) {
    if (
      !window.confirm(
        `Reverse "${name}" from this sale? Its stock goes back and the sale total drops by that line. It stays on record as reversed.`
      )
    )
      return;
    setError("");
    try {
      await api(`/sale-items/${itemId}/reverse`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reverse.");
    }
  }

  async function reverseSale(id: string, reference: string) {
    if (
      !window.confirm(
        `Reverse the whole sale ${reference}? All remaining stock goes back and the sale no longer counts in your totals.`
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
              <label>Payment</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
                <input
                  type="checkbox"
                  id="paidInFull"
                  style={{ width: "auto" }}
                  checked={paidInFull}
                  onChange={(e) => setPaidInFull(e.target.checked)}
                />
                <label htmlFor="paidInFull" style={{ margin: 0, fontWeight: 400 }}>
                  Paid in full
                </label>
              </div>
              {!paidInFull && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount paid now"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              )}
            </div>
          </div>

          <label style={{ marginTop: 6 }}>Items</label>
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <div key={i} className="line-row">
                <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>
                  <option value="">Select product</option>
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
            <button className="btn" onClick={save} disabled={saving || missingProduct}>
              {saving ? "Saving…" : "Save sale"}
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
              history.map((s) => {
                const activeItems = s.items.filter((it) => !it.voidedAt);
                return (
                  <Fragment key={s.id}>
                    <tr style={s.voidedAt ? { opacity: 0.55 } : undefined}>
                      <td className="num">{s.reference}</td>
                      <td>{s.customer?.name || "Walk-in"}</td>
                      <td>
                        {activeItems.map((it) => `${Number(it.quantity)} × ${it.product.name}`).join(", ") || "—"}
                      </td>
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
                          <button
                            className="btn ghost"
                            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                          >
                            {expandedId === s.id ? "Close" : "Details"}
                          </button>
                        </td>
                      )}
                    </tr>

                    {isAdmin && expandedId === s.id && (
                      <tr>
                        <td colSpan={7} style={{ background: "#fafbfc" }}>
                          <div style={{ padding: "2px 0" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                                padding: "8px 0",
                                borderBottom: "1px solid var(--line)",
                              }}
                            >
                              <span>
                                Payment: <strong>{s.voidedAt ? "Reversed" : s.paymentStatus}</strong>
                                <span className="muted"> — paid {cedis(s.amountPaid)} of {cedis(s.subtotal)}</span>
                              </span>
                              {!s.voidedAt && s.paymentStatus !== "PAID" && (
                                <span style={{ display: "flex", gap: 8 }}>
                                  <button className="btn ghost" onClick={() => markPaid(s.id)}>Mark as paid</button>
                                  <button className="btn ghost" onClick={() => recordPayment(s.id)}>Part payment</button>
                                </span>
                              )}
                            </div>

                            {s.items.map((it) => (
                              <div
                                key={it.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "8px 0",
                                  borderBottom: "1px solid var(--line)",
                                }}
                              >
                                <span
                                  style={
                                    it.voidedAt
                                      ? { textDecoration: "line-through", color: "var(--muted)" }
                                      : undefined
                                  }
                                >
                                  {Number(it.quantity)} × {it.product.name} — {cedis(it.lineTotal)}
                                </span>
                                {it.voidedAt ? (
                                  <span className="badge low">Reversed</span>
                                ) : !s.voidedAt ? (
                                  <button className="btn ghost" onClick={() => reverseItem(it.id, it.product.name)}>
                                    Reverse this
                                  </button>
                                ) : null}
                              </div>
                            ))}
                            {!s.voidedAt && activeItems.length > 1 && (
                              <div style={{ marginTop: 12 }}>
                                <button className="btn ghost" onClick={() => reverseSale(s.id, s.reference)}>
                                  Reverse whole sale
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
