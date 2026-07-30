"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Profit = {
  range: string;
  salesCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

const cedis = (n: number) =>
  `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProfitPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<Profit | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api<Profit>(`/reports/profit?range=${range}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [range]);

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "12px 0",
    borderBottom: "1px solid var(--line)",
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Profit</h1>
          <p>Your real bottom line — sales, minus what goods cost, minus expenses.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={`btn ${range === r.key ? "" : "ghost"}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
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
            Based on {data.salesCount} sale{data.salesCount === 1 ? "" : "s"} in this period.
            {loading ? " Updating…" : ""}
          </p>
        </div>
      )}

      {!data && !error && <p className="muted">Loading…</p>}
    </>
  );
}
