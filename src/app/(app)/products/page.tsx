"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: string;
  stock: string;
  lowStockThreshold: string;
  category: Category;
};

const cedis = (n: string | number) =>
  `GHS ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// 62.5 shows as 62.5, 62 shows as 62.
const qty = (n: string) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : String(v);
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "pack",
    sellingPrice: "",
    categoryId: "",
    lowStockThreshold: "5",
  });

  async function load() {
    try {
      const [p, c] = await Promise.all([
        api<Product[]>("/products"),
        api<Category[]>("/categories"),
      ]);
      setProducts(p);
      setCategories(c);
      if (c[0] && !form.categoryId) setForm((f) => ({ ...f, categoryId: c[0].id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addProduct() {
    setError("");
    setSaving(true);
    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          unit: form.unit,
          sellingPrice: Number(form.sellingPrice),
          categoryId: form.categoryId,
          lowStockThreshold: Number(form.lowStockThreshold),
        }),
      });
      setForm((f) => ({ ...f, name: "", sku: "", sellingPrice: "" }));
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
          <h1>Products</h1>
          <p>Your catalogue and current stock on hand.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add product"}
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
              <label>SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="field">
              <label>Selling price</label>
              <input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
            </div>
            <div className="field">
              <label>Low-stock alert at</label>
              <input type="number" step="0.25" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            </div>
          </div>
          <button className="btn" onClick={addProduct} disabled={saving}>
            {saving ? "Saving…" : "Save product"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !showForm && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th className="right">Price</th>
              <th className="right">In stock</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">No products yet. Add your first one.</td>
              </tr>
            ) : (
              products.map((p) => {
                const low = Number(p.stock) <= Number(p.lowStockThreshold);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">{p.sku}</td>
                    <td>{p.category?.name}</td>
                    <td className="right num">{cedis(p.sellingPrice)}</td>
                    <td className="right num">
                      {qty(p.stock)} {p.unit}
                      {low && <span className="badge low" style={{ marginLeft: 8 }}>Low</span>}
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
