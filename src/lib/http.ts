import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { getSession, type Session } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

export const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

// Require a signed-in user. Verifies the session token AND re-checks the
// account against the database, so disabling or changing a role takes effect
// immediately (not only when their 7-day token expires). Returns the account's
// CURRENT role from the database.
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw fail("You need to sign in.", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) {
    throw fail("Your session is no longer valid. Please sign in again.", 401);
  }
  return { userId: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "ADMIN") throw fail("Admins only.", 403);
  return session;
}

// Wrap a route handler so validation/auth errors become clean JSON responses.
export function handle(fn: () => Promise<Response>) {
  return fn().catch((err) => {
    if (err instanceof Response) return err;
    if (err instanceof ZodError) {
      const msg = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return fail(msg || "Invalid input.", 422);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return fail("That value already exists.", 409);
      if (err.code === "P2025") return fail("Record not found.", 404);
      if (err.code === "P2003") return fail("This record is linked to other data and cannot be deleted. Deactivate it instead.", 409);
    }
    console.error(err);
    return fail("Something went wrong.", 500);
  });
}
