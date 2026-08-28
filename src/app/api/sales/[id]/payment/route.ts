import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { money } from "@/lib/money";
import { z } from "zod";
import type { PaymentStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ amountPaid: z.number().nonnegative() });

// Admin only. Records how much has been paid on a sale and sets the status
// (PAID / PARTIAL / UNPAID). Touches nothing else — no stock, no profit.
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const { amountPaid } = schema.parse(await req.json());

    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id },
      select: { subtotal: true, voidedAt: true },
    });
    if (sale.voidedAt) {
      throw fail("This sale is reversed, so its payment can't be changed.", 409);
    }

    const paid = money(amountPaid);
    const bill = money(sale.subtotal);
    let status: PaymentStatus = "UNPAID";
    if (paid.gte(bill) && bill.gt(0)) status = "PAID";
    else if (paid.gt(0)) status = "PARTIAL";

    const updated = await prisma.sale.update({
      where: { id },
      data: { amountPaid: paid, paymentStatus: status },
    });
    return ok(updated);
  });
}
