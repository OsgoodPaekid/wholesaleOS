import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser, requireAdmin } from "@/lib/http";
import { productSchema } from "@/lib/validation";
import { money } from "@/lib/money";

// Any signed-in user (incl. salespeople) may view products, stock and price.
// Note: Product has no cost field, so nothing sensitive is exposed here.
export async function GET() {
  return handle(async () => {
    await requireUser();
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    });
    return ok(products);
  });
}

// Only admins can create products.
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const data = productSchema.parse(await req.json());
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        sellingPrice: money(data.sellingPrice),
        lowStockThreshold: money(data.lowStockThreshold),
        categoryId: data.categoryId,
      },
    });
    return ok(product, 201);
  });
}
