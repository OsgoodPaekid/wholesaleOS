import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { adjustmentSchema } from "@/lib/validation";
import { D, ZERO } from "@/lib/money";

// Admin only: manual inventory correction.
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireAdmin();
    const data = adjustmentSchema.parse(await req.json());
    const delta = D(data.delta);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: data.productId },
      });

      const newStock = product.stock.plus(delta);
      if (newStock.lt(ZERO)) {
        throw fail(
          `That would take stock below zero (current ${product.stock.toString()}).`,
          409
        );
      }

      if (delta.lt(ZERO)) {
        let toRemove = delta.negated();
        const batches = await tx.stockBatch.findMany({
          where: { productId: product.id, remainingQty: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });
        for (const batch of batches) {
          if (toRemove.lte(ZERO)) break;
          const takeQty = toRemove.lt(batch.remainingQty)
            ? toRemove
            : batch.remainingQty;
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: { remainingQty: { decrement: takeQty } },
          });
          toRemove = toRemove.minus(takeQty);
        }
      } else {
        const last = await tx.stockBatch.findFirst({
          where: { productId: product.id },
          orderBy: { createdAt: "desc" },
        });
        await tx.stockBatch.create({
          data: {
            productId: product.id,
            unitCost: last?.unitCost ?? ZERO,
            initialQty: delta,
            remainingQty: delta,
          },
        });
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId: product.id,
          delta,
          reason: data.reason,
          createdById: user.userId,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      return adjustment;
    }, { maxWait: 15000, timeout: 25000 });

    return ok(result, 201);
  });
}
