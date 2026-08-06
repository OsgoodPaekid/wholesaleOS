import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Fresh-start seed: just an admin login and one starter category.
// No sample products, suppliers, customers, or sales.
async function main() {
  const adminHash = await bcrypt.hash("Admin1234!", 10);

  await prisma.user.upsert({
    where: { email: "admin@wholesale.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@wholesale.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  // One category so the "Add product" form works right away.
  // You can add your own from the Products page ("+ New" next to Category).
  await prisma.category.upsert({
    where: { name: "General" },
    update: {},
    create: { name: "General" },
  });

  console.log("Seed complete.");
  console.log("  Admin login: admin@wholesale.com / Admin1234!");
  console.log("  Change this password after logging in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
