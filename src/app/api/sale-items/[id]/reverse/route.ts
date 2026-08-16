import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { D, money, ZERO } from "@/lib/money";
import type { PaymentStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// Admin only. Reverses ONE line from a sale: returns that item's stock, marks the
// line reversed, and recomputes the sale's totals. If it was the last active line,
// the whole sale is marked reversed.
export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params; // sale item id

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.saleItem.findUniqueOrThrow({
        where: { id },
        include: { sale: { include: { items: true } } },
      });

      if (item.voidedAt) throw fail("This item has already been reversed.", 409);
      if (item.sale.voidedAt) throw fail("This whole sale is already reversed.", 409);

      // Return this item's stock, at the cost it was sold at.
      await tx.stockBatch.create({
        data: {
          productId: item.productId,
          unitCost: item.unitCost,
          initialQty: item.quantity,
          remainingQty: item.quantity,
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      await tx.saleItem.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: admin.userId },
      });

      // What's left of the sale after this line is removed.
      const active = item.sale.items.filter((it) => it.id !== id && !it.voidedAt);

      if (active.length === 0) {
        return tx.sale.update({
          where: { id: item.saleId },
          data: {
            subtotal: ZERO,
            cogs: ZERO,
            paymentStatus: "UNPAID",
            voidedAt: new Date(),
            voidedById: admin.userId,
          },
        });
      }

      let subtotal = ZERO;
      let cogs = ZERO;
      for (const it of active) {
        subtotal = subtotal.plus(it.lineTotal);
        cogs = cogs.plus(D(it.quantity).times(it.unitCost));
      }
      subtotal = money(subtotal);
      cogs = money(cogs);

      const paid = money(item.sale.amountPaid);
      let status: PaymentStatus = "UNPAID";
      if (paid.gte(subtotal) && subtotal.gt(0)) status = "PAID";
      else if (paid.gt(0)) status = "PARTIAL";

      return tx.sale.update({
        where: { id: item.saleId },
        data: { subtotal, cogs, paymentStatus: status },
      });
    }, { maxWait: 15000, timeout: 25000 });

    return ok(result);
  });
}
