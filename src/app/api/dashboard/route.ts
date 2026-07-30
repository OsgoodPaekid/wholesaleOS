import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { D, ZERO, money } from "@/lib/money";

// Admin only: the dashboard shows profit and stock value.
export async function GET() {
  return handle(async () => {
    await requireAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [products, batches, salesToday, salesMonth, unpaid, recentSales] =
      await Promise.all([
        prisma.product.findMany(),
        prisma.stockBatch.findMany({
          where: { remainingQty: { gt: 0 } },
          select: { remainingQty: true, unitCost: true },
        }),
        prisma.sale.findMany({
          where: { createdAt: { gte: startOfToday }, voidedAt: null },
          select: { subtotal: true, cogs: true },
        }),
        prisma.sale.findMany({
          where: { createdAt: { gte: startOfMonth }, voidedAt: null },
          select: { subtotal: true, cogs: true, createdAt: true },
        }),
        prisma.sale.count({ where: { paymentStatus: { not: "PAID" }, voidedAt: null } }),
        prisma.sale.findMany({
          where: { voidedAt: null },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { customer: true },
        }),
      ]);

    const totalStockValue = batches.reduce(
      (sum, b) => sum.plus(b.remainingQty.times(b.unitCost)),
      ZERO
    );

    const sumSales = (rows: { subtotal: unknown; cogs: unknown }[]) =>
      rows.reduce(
        (acc, r) => ({
          sales: acc.sales.plus(r.subtotal as never),
          profit: acc.profit.plus(D(r.subtotal as never).minus(r.cogs as never)),
        }),
        { sales: ZERO, profit: ZERO }
      );

    const today = sumSales(salesToday);
    const thisMonth = sumSales(salesMonth);

    const perDay = new Map<string, { sales: import("@prisma/client").Prisma.Decimal }>();
    for (const s of salesMonth) {
      const key = s.createdAt.toISOString().slice(0, 10);
      const cur = perDay.get(key)?.sales ?? ZERO;
      perDay.set(key, { sales: cur.plus(s.subtotal) });
    }
    const monthlySales = [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, sales: Number(money(v.sales)) }));

    const lowStockCount = products.filter((p) =>
      p.stock.lte(p.lowStockThreshold)
    ).length;

    return ok({
      totalProducts: products.length,
      totalStockValue: Number(money(totalStockValue)),
      today: {
        sales: Number(money(today.sales)),
        profit: Number(money(today.profit)),
      },
      thisMonth: {
        sales: Number(money(thisMonth.sales)),
        profit: Number(money(thisMonth.profit)),
      },
      unpaidInvoices: unpaid,
      lowStockCount,
      monthlySales,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        reference: s.reference,
        customer: s.customer?.name ?? "Walk-in",
        total: Number(money(s.subtotal)),
        paymentStatus: s.paymentStatus,
        createdAt: s.createdAt,
      })),
    });
  });
}
