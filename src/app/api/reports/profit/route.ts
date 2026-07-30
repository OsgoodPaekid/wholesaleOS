import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { D, money } from "@/lib/money";

// Lower bound for each period. "all" returns null (no lower bound).
function rangeStart(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null; // "all"
  }
}

// Admin only: this is the true bottom line (includes expenses).
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const range = new URL(req.url).searchParams.get("range") || "month";
    const start = rangeStart(range);
    const saleWhere = start ? { createdAt: { gte: start }, voidedAt: null } : { voidedAt: null };
    const where = start ? { createdAt: { gte: start } } : {};

    const [saleAgg, expAgg, salesCount] = await Promise.all([
      prisma.sale.aggregate({ _sum: { subtotal: true, cogs: true }, where: saleWhere }),
      prisma.expense.aggregate({ _sum: { amount: true }, where }),
      prisma.sale.count({ where: saleWhere }),
    ]);

    const revenue = D(saleAgg._sum.subtotal ?? 0);
    const cogs = D(saleAgg._sum.cogs ?? 0);
    const expenses = D(expAgg._sum.amount ?? 0);
    const grossProfit = revenue.minus(cogs);
    const netProfit = grossProfit.minus(expenses);

    return ok({
      range,
      salesCount,
      revenue: Number(money(revenue)),
      cogs: Number(money(cogs)),
      grossProfit: Number(money(grossProfit)),
      expenses: Number(money(expenses)),
      netProfit: Number(money(netProfit)),
    });
  });
}
