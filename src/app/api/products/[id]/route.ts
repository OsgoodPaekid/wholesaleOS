import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireUser, requireAdmin } from "@/lib/http";
import { productUpdateSchema } from "@/lib/validation";
import { money } from "@/lib/money";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const product = await prisma.product.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
    return ok(product);
  });
}

// Admin only. Edits catalogue details only — never touches cost or stock,
// so it's safe and doesn't affect past sales or profit.
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const data = productUpdateSchema.parse(await req.json());

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.sellingPrice !== undefined && { sellingPrice: money(data.sellingPrice) }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.lowStockThreshold !== undefined && {
          lowStockThreshold: money(data.lowStockThreshold),
        }),
      },
      include: { category: true },
    });
    return ok(product);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    // Keep history intact: only allow deleting products never stocked or sold.
    const [sales, batches] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.stockBatch.count({ where: { productId: id } }),
    ]);
    if (sales > 0 || batches > 0) {
      throw fail("This product has stock or sales history, so it can't be deleted.", 400);
    }
    await prisma.product.delete({ where: { id } });
    return ok({ success: true });
  });
}
