import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { money } from "@/lib/money";

// Parse a yyyy-mm-dd string into a local-midnight Date.
function parseDay(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Admin only: total sales for a chosen date range, broken down by salesperson
// and by best-selling product.
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const now = new Date();

    const from =
      parseDay(url.searchParams.get("from")) ??
      new Date(now.getFullYear(), now.getMonth(), 1);
    const toDay =
      parseDay(url.searchParams.get("to")) ??
      new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Include the whole "to" day by ending at the next midnight.
    const toExclusive = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1);
    if (toExclusive <= from) {
      throw fail("The 'to' date must be on or after the 'from' date.", 400);
    }

    const where = { createdAt: { gte: from, lt: toExclusive }, voidedAt: null };

    const [agg, groups, people, productGroups, products] = await Promise.all([
      prisma.sale.aggregate({ _sum: { subtotal: true }, _count: true, where }),
      prisma.sale.groupBy({
        by: ["createdById"],
        _sum: { subtotal: true },
        _count: true,
        where,
      }),
      prisma.user.findMany({ select: { id: true, name: true } }),
      // Sum each product's revenue and quantity across sales in range (skip reversed).
      prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: { lineTotal: true, quantity: true },
        where: { sale: where },
      }),
      prisma.product.findMany({ select: { id: true, name: true, unit: true } }),
    ]);

    const nameById = new Map(people.map((p) => [p.id, p.name]));
    const bySalesperson = groups
      .map((g) => ({
        id: g.createdById,
        name: nameById.get(g.createdById) ?? "Unknown",
        total: Number(money(g._sum.subtotal ?? 0)),
        count: g._count,
      }))
      .sort((a, b) => b.total - a.total);

    const prodById = new Map(products.map((p) => [p.id, p]));
    const topProducts = productGroups
      .map((g) => ({
        id: g.productId,
        name: prodById.get(g.productId)?.name ?? "Unknown",
        unit: prodById.get(g.productId)?.unit ?? "",
        quantity: Number(g._sum.quantity ?? 0),
        total: Number(money(g._sum.lineTotal ?? 0)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return ok({
      from: from.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      total: Number(money(agg._sum.subtotal ?? 0)),
      count: agg._count,
      bySalesperson,
      topProducts,
    });
  });
}
