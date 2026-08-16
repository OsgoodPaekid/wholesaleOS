import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// Admin only. Reverses a whole sale: returns each still-active item's stock and
// marks the sale reversed. Items already reversed line-by-line are skipped so
// their stock isn't returned twice.
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

      for (const item of sale.items) {
        if (item.voidedAt) continue; // already returned via a line reversal
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
    }, { maxWait: 15000, timeout: 25000 });

    return ok(result);
  });
}
