import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { expenseSchema } from "@/lib/validation";
import { money } from "@/lib/money";

// Admin only: expenses are financial data.
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok(
      await prisma.expense.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
    );
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireAdmin();
    const data = expenseSchema.parse(await req.json());
    return ok(
      await prisma.expense.create({
        data: {
          title: data.title,
          amount: money(data.amount),
          category: data.category,
          note: data.note,
          createdById: user.userId,
        },
      }),
      201
    );
  });
}
