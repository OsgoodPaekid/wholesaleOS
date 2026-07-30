import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser, requireAdmin } from "@/lib/http";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    await requireUser();
    return ok(await prisma.category.findMany({ orderBy: { name: "asc" } }));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { name } = categorySchema.parse(await req.json());
    return ok(await prisma.category.create({ data: { name } }), 201);
  });
}
