import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.note.delete({ where: { id } });
    return ok({ success: true });
  });
}
