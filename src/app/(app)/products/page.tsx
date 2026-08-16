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

const blankForm = {
  name: "",
  sku: "",
  unit: "pack",
  sellingPrice: "",
  categoryId: "",
  lowStockThreshold: "5",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blankForm });

  async function load() {
    try {
      const [p, c, me] = await Promise.all([
        api<Product[]>("/products"),
        api<Category[]>("/categories"),
        api<{ user: { role: string } | null }>("/auth/me"),
      ]);
      setProducts(p);
      setCategories(c);
      setIsAdmin(me.user?.role === "ADMIN");
      if (c[0]) setForm((f) => (f.categoryId ? f : { ...f, categoryId: c[0].id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAdd() {
    setEditingId(null);
    setForm({ ...blankForm, categoryId: categories[0]?.id || "" });
    setShowForm(true);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      sellingPrice: p.sellingPrice,
      categoryId: p.category?.id || categories[0]?.id || "",
      lowStockThreshold: p.lowStockThreshold,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function saveProduct() {
    setError("");
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      unit: form.unit,
      sellingPrice: Number(form.sellingPrice),
      categoryId: form.categoryId,
      lowStockThreshold: Number(form.lowStockThreshold),
    };
    try {
      if (editingId) {
        await api(`/products/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/products", { method: "POST", body: JSON.stringify(payload) });
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    const name = window.prompt("New category name:");
    if (!name || !name.trim()) return;
    setError("");
    try {
      const cat = await api<Category>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      await load();
      setForm((f) => ({ ...f, categoryId: cat.id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add category.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>Your catalogue and current stock on hand.</p>
        </div>
        {isAdmin && (
          <button className="btn" onClick={() => (showForm ? closeForm() : startAdd())}>
            {showForm ? "Close" : "Add product"}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            {editingId ? "Edit product" : "New product"}
          </div>
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
              <label>
                Category
                <button
                  type="button"
                  onClick={addCategory}
                  className="btn ghost"
                  style={{ padding: "1px 8px", fontSize: 12, marginLeft: 8, fontWeight: 600 }}
                >
                  + New
                </button>
              </label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.length === 0 && <option value="">Add a category first</option>}
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
          <button className="btn" onClick={saveProduct} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Save product"}
          </button>
          <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
            Editing these details is safe — it never changes an item&apos;s cost or your past sales.
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
              <th>SKU</th>
              <th>Category</th>
              <th className="right">Price</th>
              <th className="right">In stock</th>
              {isAdmin && <th className="right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="muted">No products yet. Add your first one.</td>
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
                      {Number(p.stock)} {p.unit}
                      {low && <span className="badge low" style={{ marginLeft: 8 }}>Low</span>}
                    </td>
                    {isAdmin && (
                      <td className="right">
                        <button className="btn ghost" onClick={() => startEdit(p)}>Edit</button>
                      </td>
                    )}
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
