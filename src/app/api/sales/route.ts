import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireUser } from "@/lib/http";
import { saleSchema } from "@/lib/validation";
import { D, money, ZERO } from "@/lib/money";
import type { PaymentStatus } from "@prisma/client";

const ref = () => `INV-${Date.now().toString(36).toUpperCase()}`;

// Salespeople see only their own sales, with cost/profit fields removed.
// Admins see everyone's sales, including who made each one.
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const isAdmin = user.role === "ADMIN";

    const sales = await prisma.sale.findMany({
      where: isAdmin ? {} : { createdById: user.userId },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (isAdmin) return ok(sales);

    // Strip anything cost/profit-related before it leaves the server.
    const safe = sales.map((s) => {
      const sale = { ...s } as Record<string, unknown>;
      delete sale.cogs;
      sale.items = s.items.map((it) => {
        const item = { ...it } as Record<string, unknown>;
        delete item.unitCost;
        return item;
      });
      return sale;
    });
    return ok(safe);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const data = saleSchema.parse(await req.json());

    const sale = await prisma.$transaction(async (tx) => {
      let subtotal = ZERO;
      let cogs = ZERO;

      const created = await tx.sale.create({
        data: {
          reference: ref(),
          subtotal: ZERO,
          cogs: ZERO,
          amountPaid: money(data.amountPaid),
          paymentStatus: "UNPAID",
          note: data.note,
          customerId: data.customerId || null,
          createdById: user.userId,
        },
      });

      for (const item of data.items) {
        let needed = D(item.quantity);
        const unitPrice = money(item.unitPrice);
        const lineTotal = money(needed.times(unitPrice));
        subtotal = subtotal.plus(lineTotal);

        const batches = await tx.stockBatch.findMany({
          where: { productId: item.productId, remainingQty: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });

        const available = batches.reduce((sum, b) => sum.plus(b.remainingQty), ZERO);
        if (available.lt(needed)) {
          throw fail(
            `Not enough stock for one of the products. Have ${available.toString()}, need ${needed.toString()}.`,
            409
          );
        }

        let lineCost = ZERO;
        for (const batch of batches) {
          if (needed.lte(0)) break;
          const takeQty = needed.lt(batch.remainingQty) ? needed : batch.remainingQty;
          lineCost = lineCost.plus(takeQty.times(batch.unitCost));
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: { remainingQty: { decrement: takeQty } },
          });
          needed = needed.minus(takeQty);
        }

        cogs = cogs.plus(lineCost);
        const qty = D(item.quantity);
        const unitCost = money(qty.isZero() ? ZERO : lineCost.dividedBy(qty));

        await tx.saleItem.create({
          data: {
            saleId: created.id,
            productId: item.productId,
            quantity: qty,
            unitPrice,
            lineTotal,
            unitCost,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: qty } },
        });
      }

      const paid = money(data.amountPaid);
      const bill = money(subtotal);
      let status: PaymentStatus = "UNPAID";
      if (paid.gte(bill) && bill.gt(0)) status = "PAID";
      else if (paid.gt(0)) status = "PARTIAL";

      return tx.sale.update({
        where: { id: created.id },
        data: { subtotal: bill, cogs: money(cogs), paymentStatus: status },
        include: { customer: true, items: { include: { product: true } } },
      });
    }, { maxWait: 15000, timeout: 25000 });

    return ok(sale, 201);
  });
}
