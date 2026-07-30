import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// Admin only. Reverses a sale: returns the sold goods to stock (as a batch at the
// sale's recorded cost) and marks the sale as reversed. Kept for the audit trail.
export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      if (sale.voidedAt) throw fail("This sale has already been reversed.", 409);

      // Put each item's quantity back into stock, at the cost it was sold at.
      for (const item of sale.items) {
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
      }

      return tx.sale.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: admin.userId },
      });
    });

    return ok(result);
  });
}
