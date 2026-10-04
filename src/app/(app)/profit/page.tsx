"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/client";

type Profit = {
  from: string | null;
  to: string | null;
  salesCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

const cedis = (n: number) =>
  `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Local yyyy-mm-dd helper.
const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function ProfitPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(ymd(monthStart));
  const [to, setTo] = useState(ymd(today));
  const [data, setData] = useState<Profit | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api<Profit>(`/reports/profit?from=${from}&to=${to}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [from, to]);

  // Quick presets adjust the two date boxes. "All time" clears both.
  function preset(kind: "today" | "week" | "month" | "year" | "all") {
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
    } else if (kind === "year") {
      setFrom(ymd(new Date(now.getFullYear(), 0, 1)));
      setTo(ymd(now));
    } else {
      setFrom("");
      setTo("");
    }
  }

  const rowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "12px 0",
    borderBottom: "1px solid var(--line)",
  };

  const rangeLabel = data
    ? data.from && data.to
      ? `${data.from} to ${data.to}`
      : data.from
      ? `Since ${data.from}`
      : data.to
      ? `Up to ${data.to}`
      : "All time"
    : "";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Profit</h1>
          <p>Your real bottom line — sales, minus what goods cost, minus expenses — for any period.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={() => preset("today")}>Today</button>
            <button className="btn ghost" onClick={() => preset("week")}>Last 7 days</button>
            <button className="btn ghost" onClick={() => preset("month")}>This month</button>
            <button className="btn ghost" onClick={() => preset("year")}>This year</button>
            <button className="btn ghost" onClick={() => preset("all")}>All time</button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {data && !error && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ ...rowStyle }}>
            <span>Revenue (sales)</span>
            <span className="num">{cedis(data.revenue)}</span>
          </div>
          <div style={{ ...rowStyle }}>
            <span className="muted">− Cost of goods sold</span>
            <span className="num muted">{cedis(data.cogs)}</span>
          </div>
          <div style={{ ...rowStyle, fontWeight: 700 }}>
            <span>= Gross profit</span>
            <span className="num">{cedis(data.grossProfit)}</span>
          </div>
          <div style={{ ...rowStyle }}>
            <span className="muted">− Expenses</span>
            <span className="num muted">{cedis(data.expenses)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingTop: 16,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 18 }}>= Net profit</span>
            <span
              className="num"
              style={{
                fontWeight: 700,
                fontSize: 24,
                color: data.netProfit >= 0 ? "var(--accent)" : "var(--danger)",
              }}
            >
              {cedis(data.netProfit)}
            </span>
          </div>

          <p className="muted" style={{ fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            {rangeLabel} · based on {data.salesCount} sale{data.salesCount === 1 ? "" : "s"}.
            {loading ? " Updating…" : ""}
          </p>
        </div>
      )}

      {!data && !error && <p className="muted">Loading…</p>}
    </>
  );
}
