import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

async function main() {
  // ---- Users ----
  const adminHash = await bcrypt.hash("Admin1234!", 10);
  const staffHash = await bcrypt.hash("Staff1234!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@wholesale.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@wholesale.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@wholesale.com" },
    update: {},
    create: {
      name: "Staff",
      email: "staff@wholesale.com",
      passwordHash: staffHash,
      role: "STAFF",
    },
  });

  // ---- Categories ----
  const categoryNames = ["Beverages", "Grains", "Toiletries", "Snacks"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = c.id;
  }

  // ---- Supplier & customer ----
  const supplier = await prisma.supplier.create({
    data: { name: "Accra Distributors Ltd", phone: "024 000 0000", address: "Accra" },
  });
  await prisma.customer.create({
    data: { name: "Corner Shop", phone: "020 111 1111", address: "Kumasi" },
  });

  // ---- Products (price, opening qty, opening cost) ----
  const seed = [
    { name: "Cola 30cl (case)", sku: "BEV-COLA-30", cat: "Beverages", price: 95, qty: 40, cost: 72 },
    { name: "Bottled Water (pack)", sku: "BEV-WATER-15", cat: "Beverages", price: 18, qty: 120, cost: 12 },
    { name: "Rice 5kg (bag)", sku: "GRN-RICE-5", cat: "Grains", price: 78, qty: 60, cost: 60 },
    { name: "Sugar 1kg (pack)", sku: "GRN-SUGAR-1", cat: "Grains", price: 14, qty: 200, cost: 9.5 },
    { name: "Bath Soap (dozen)", sku: "TOI-SOAP-12", cat: "Toiletries", price: 42, qty: 30, cost: 30 },
    { name: "Biscuits (box)", sku: "SNK-BISC-24", cat: "Snacks", price: 55, qty: 25, cost: 40 },
  ];

  // Record opening stock as a purchase so FIFO batches exist and cost is tracked.
  const purchase = await prisma.purchase.create({
    data: {
      reference: "PO-OPENING",
      total: D(0),
      note: "Opening stock",
      supplierId: supplier.id,
      createdById: admin.id,
    },
  });

  let purchaseTotal = D(0);
  for (const s of seed) {
    const product = await prisma.product.create({
      data: {
        name: s.name,
        sku: s.sku,
        unit: "pack",
        sellingPrice: D(s.price),
        stock: D(s.qty),
        lowStockThreshold: D(10),
        categoryId: categories[s.cat],
      },
    });

    const quantity = D(s.qty);
    const unitCost = D(s.cost);
    const lineTotal = quantity.times(unitCost);
    purchaseTotal = purchaseTotal.plus(lineTotal);

    const item = await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        productId: product.id,
        quantity,
        unitCost,
        lineTotal,
      },
    });

    await prisma.stockBatch.create({
      data: {
        productId: product.id,
        purchaseItemId: item.id,
        unitCost,
        initialQty: quantity,
        remainingQty: quantity,
      },
    });
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { total: purchaseTotal },
  });

  console.log("Seed complete.");
  console.log("  Admin: admin@wholesale.com / Admin1234!");
  console.log("  Staff: staff@wholesale.com / Staff1234!");
  console.log("  Change these before going live.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
