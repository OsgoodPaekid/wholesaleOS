import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser, requireAdmin } from "@/lib/http";
import { productSchema } from "@/lib/validation";
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

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const data = productSchema.partial().parse(await req.json());
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.sellingPrice !== undefined && { sellingPrice: money(data.sellingPrice) }),
        ...(data.lowStockThreshold !== undefined && {
          lowStockThreshold: money(data.lowStockThreshold),
        }),
      },
    });
    return ok(product);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return ok({ success: true });
  });
}
