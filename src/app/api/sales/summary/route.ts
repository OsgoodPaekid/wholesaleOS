import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser } from "@/lib/http";
import { money } from "@/lib/money";

// Returns the CURRENT user's own sales total for today. No cost/profit involved.
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const agg = await prisma.sale.aggregate({
      _sum: { subtotal: true },
      _count: true,
      where: { createdById: user.userId, createdAt: { gte: startOfToday }, voidedAt: null },
    });

    return ok({
      total: Number(money(agg._sum.subtotal ?? 0)),
      count: agg._count,
    });
  });
}
