"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Report = {
  from: string;
  to: string;
  total: number;
  count: number;
  bySalesperson: { id: string; name: string; total: number; count: number }[];
  topProducts: { id: string; name: string; unit: string; quantity: number; total: number }[];
};

const cedis = (n: number) =>
  `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Local yyyy-mm-dd helper.
const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function SalesReportPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(ymd(monthStart));
  const [to, setTo] = useState(ymd(today));
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api<Report>(`/reports/sales?from=${from}&to=${to}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [from, to]);

  // Quick presets adjust the two date boxes.
  function preset(kind: "today" | "week" | "month" | "year") {
    const now = new Date();
    if (kind === "today") {
      setFrom(ymd(now));
      setTo(ymd(now));
    } else if (kind === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setFrom(ymd(d));
      setTo(ymd(now));
    } else if (kind === "month") {
      setFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(ymd(now));
    } else {
      setFrom(ymd(new Date(now.getFullYear(), 0, 1)));
      setTo(ymd(now));
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sales report</h1>
          <p>Total sales for any date range, and who sold what.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={() => preset("today")}>Today</button>
            <button className="btn ghost" onClick={() => preset("week")}>Last 7 days</button>
            <button className="btn ghost" onClick={() => preset("month")}>This month</button>
            <button className="btn ghost" onClick={() => preset("year")}>This year</button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {data && !error && (
        <>
          <div className="grid stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 520, marginBottom: 16 }}>
            <div className="card stat">
              <div className="label">Total sales</div>
              <div className="value num">{cedis(data.total)}</div>
              <div className="sub">
                {data.from} to {data.to}
              </div>
            </div>
            <div className="card stat">
              <div className="label">Number of sales</div>
              <div className="value num">{data.count}</div>
              <div className="sub">{loading ? "Updating…" : "in this period"}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: "6px 0 12px" }}>By salesperson</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Salesperson</th>
                  <th className="right">Sales</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.bySalesperson.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">No sales in this period.</td>
                  </tr>
                ) : (
                  data.bySalesperson.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="right num">{s.count}</td>
                      <td className="right num">{cedis(s.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 15, margin: "22px 0 12px" }}>Best-selling products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Product</th>
                  <th className="right">Units sold</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">No sales in this period.</td>
                  </tr>
                ) : (
                  data.topProducts.map((p, i) => (
                    <tr key={p.id}>
                      <td className="num">{i + 1}</td>
                      <td>{p.name}</td>
                      <td className="right num">{p.quantity} {p.unit}</td>
                      <td className="right num">{cedis(p.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && !error && <p className="muted">Loading…</p>}
    </>
  );
}
