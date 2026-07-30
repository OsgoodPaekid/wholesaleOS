"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/client";

type Dashboard = {
  totalProducts: number;
  totalStockValue: number;
  today: { sales: number; profit: number };
  thisMonth: { sales: number; profit: number };
  unpaidInvoices: number;
  lowStockCount: number;
  monthlySales: { date: string; sales: number }[];
  recentSales: {
    id: string;
    reference: string;
    customer: string;
    total: number;
    paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
    createdAt: string;
  }[];
};

const cedis = (n: number) =>
  `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/dashboard").then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Today at a glance, plus this month&apos;s trend.</p>
        </div>
      </div>

      <div className="grid stats" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="label">Sales today</div>
          <div className="value num">{cedis(d.today.sales)}</div>
          <div className="sub">Profit {cedis(d.today.profit)}</div>
        </div>
        <div className="card stat">
          <div className="label">Sales this month</div>
          <div className="value num">{cedis(d.thisMonth.sales)}</div>
          <div className="sub">Profit {cedis(d.thisMonth.profit)}</div>
        </div>
        <div className="card stat">
          <div className="label">Stock value</div>
          <div className="value num">{cedis(d.totalStockValue)}</div>
          <div className="sub">{d.totalProducts} products</div>
        </div>
        <div className="card stat">
          <div className="label">Needs attention</div>
          <div className="value num">{d.unpaidInvoices + d.lowStockCount}</div>
          <div className="sub">
            {d.unpaidInvoices} unpaid · {d.lowStockCount} low stock
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Sales this month</h3>
        {d.monthlySales.length === 0 ? (
          <p className="muted">No sales yet this month.</p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={d.monthlySales} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b6472" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6472" }} width={44} />
                <Tooltip formatter={(v: number) => cedis(v)} />
                <Bar dataKey="sales" fill="#2f6f4e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th className="right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {d.recentSales.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No sales recorded yet.</td>
              </tr>
            ) : (
              d.recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="num">{s.reference}</td>
                  <td>{s.customer}</td>
                  <td className="right num">{cedis(s.total)}</td>
                  <td>
                    <span className={`badge ${s.paymentStatus.toLowerCase()}`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
