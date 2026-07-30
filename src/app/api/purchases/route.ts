import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { purchaseSchema } from "@/lib/validation";
import { D, money, ZERO } from "@/lib/money";

const ref = () => `PO-${Date.now().toString(36).toUpperCase()}`;

// Admin only: purchases contain cost prices.
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(purchases);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireAdmin();
    const data = purchaseSchema.parse(await req.json());

    const purchase = await prisma.$transaction(async (tx) => {
      let total = ZERO;

      const created = await tx.purchase.create({
        data: {
          reference: ref(),
          total: ZERO,
          note: data.note,
          supplierId: data.supplierId,
          createdById: user.userId,
        },
      });

      for (const item of data.items) {
        const quantity = D(item.quantity);
        const unitCost = money(item.unitCost);
        const lineTotal = money(quantity.times(unitCost));
        total = total.plus(lineTotal);

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: created.id,
            productId: item.productId,
            quantity,
            unitCost,
            lineTotal,
          },
        });

        await tx.stockBatch.create({
          data: {
            productId: item.productId,
            purchaseItemId: purchaseItem.id,
            unitCost,
            initialQty: quantity,
            remainingQty: quantity,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: quantity } },
        });
      }

      return tx.purchase.update({
        where: { id: created.id },
        data: { total: money(total) },
        include: { supplier: true, items: { include: { product: true } } },
      });
    }, { maxWait: 15000, timeout: 25000 });

    return ok(purchase, 201);
  });
}
