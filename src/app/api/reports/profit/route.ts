import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { D, money } from "@/lib/money";

function parseDay(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Admin only: this is the true bottom line (includes expenses).
// Accepts optional from/to (yyyy-mm-dd). Blank = no bound on that side
// (so blank/blank means all time). Sales and expenses use the same window.
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const from = parseDay(url.searchParams.get("from"));
    const toDay = parseDay(url.searchParams.get("to"));
    const lt = toDay
      ? new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1)
      : null;
    if (from && lt && lt <= from) {
      throw fail("The 'to' date must be on or after the 'from' date.", 400);
    }

    const createdAt: { gte?: Date; lt?: Date } = {};
    if (from) createdAt.gte = from;
    if (lt) createdAt.lt = lt;
    const hasRange = Boolean(from || lt);

    const saleWhere = hasRange ? { voidedAt: null, createdAt } : { voidedAt: null };
    const expWhere = hasRange ? { createdAt } : {};

    const [saleAgg, expAgg, salesCount] = await Promise.all([
      prisma.sale.aggregate({ _sum: { subtotal: true, cogs: true }, where: saleWhere }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: expWhere }),
      prisma.sale.count({ where: saleWhere }),
    ]);

    const revenue = D(saleAgg._sum.subtotal ?? 0);
    const cogs = D(saleAgg._sum.cogs ?? 0);
    const expenses = D(expAgg._sum.amount ?? 0);
    const grossProfit = revenue.minus(cogs);
    const netProfit = grossProfit.minus(expenses);

    return ok({
      from: from ? from.toISOString().slice(0, 10) : null,
      to: toDay ? toDay.toISOString().slice(0, 10) : null,
      salesCount,
      revenue: Number(money(revenue)),
      cogs: Number(money(cogs)),
      grossProfit: Number(money(grossProfit)),
      expenses: Number(money(expenses)),
      netProfit: Number(money(netProfit)),
    });
  });
}
