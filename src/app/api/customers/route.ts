import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser } from "@/lib/http";
import { partySchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    await requireUser();
    return ok(await prisma.customer.findMany({ orderBy: { name: "asc" } }));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const data = partySchema.parse(await req.json());
    return ok(await prisma.customer.create({ data: { ...data, email: data.email || null } }), 201);
  });
}
