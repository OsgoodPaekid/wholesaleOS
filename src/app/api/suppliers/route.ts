import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { partySchema } from "@/lib/validation";

// Admin only: suppliers reveal who you buy from and are business-sensitive.
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok(await prisma.supplier.findMany({ orderBy: { name: "asc" } }));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const data = partySchema.parse(await req.json());
    return ok(await prisma.supplier.create({ data: { ...data, email: data.email || null } }), 201);
  });
}
