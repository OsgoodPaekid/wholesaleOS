"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

// Only allow redirects to internal paths — blocks open-redirect to other sites
// (e.g. ?next=https://evil.com or ?next=//evil.com).
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setError("");
    setLoading(true);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(safeNext(params.get("next")));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <div className="card">
        <div className="brand-mark">
          Wholesale<span>OS</span>
        </div>
        <h1>Sign in</h1>
        <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
          Manage stock, sales and profit.
        </p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            placeholder="admin@wholesale.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            placeholder="••••••••"
          />
        </div>

        <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={signIn} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
