"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profit", label: "Profit" },
  { href: "/products", label: "Products" },
  { href: "/purchases", label: "Purchases" },
  { href: "/sales", label: "Sales" },
  { href: "/reports", label: "Sales report" },
  { href: "/stock", label: "Stock" },
  { href: "/expenses", label: "Expenses" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/users", label: "Users" },
];

// Salespeople only see what they're allowed to use.
const SALES_LINKS = [
  { href: "/sales", label: "Sales" },
  { href: "/products", label: "Products" },
  { href: "/customers", label: "Customers" },
];

export default function Sidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = role === "ADMIN" ? ADMIN_LINKS : SALES_LINKS;

  async function signOut() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <div className="brand">
          Wholesale<span>OS</span>
        </div>
        <button
          className="nav-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Tapping a link also closes the menu on mobile. */}
      <nav className="nav" onClick={() => setOpen(false)}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname.startsWith(l.href) ? "active" : ""}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-foot">
        Signed in as<br />
        <strong style={{ color: "#fff" }}>{name}</strong>
        <div style={{ fontSize: 12, marginTop: 2, opacity: 0.7 }}>
          {role === "ADMIN" ? "Administrator" : "Salesperson"}
        </div>
        <button onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
