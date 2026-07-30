import { prisma } from "@/lib/prisma";
import { handle, ok, fail, requireAdmin } from "@/lib/http";
import { userUpdateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  canEditSale: true,
  canCancelSale: true,
  createdAt: true,
} as const;

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const data = userUpdateSchema.parse(await req.json());

    // Guards so an admin can't lock themselves out.
    if (id === admin.userId && data.active === false) {
      throw fail("You can't disable your own account.", 400);
    }
    if (id === admin.userId && data.role && data.role !== "ADMIN") {
      throw fail("You can't remove your own admin access.", 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.canEditSale !== undefined && { canEditSale: data.canEditSale }),
        ...(data.canCancelSale !== undefined && { canCancelSale: data.canCancelSale }),
        ...(data.password !== undefined && {
          passwordHash: await hashPassword(data.password),
        }),
      },
      select: publicUser,
    });
    return ok(user);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.userId) throw fail("You can't delete your own account.", 400);

    // If they have sales on record, keep history intact — deactivate instead.
    const sales = await prisma.sale.count({ where: { createdById: id } });
    if (sales > 0) {
      throw fail(
        "This person has sales on record, so they can't be deleted. Disable them instead.",
        400
      );
    }
    await prisma.user.delete({ where: { id } });
    return ok({ success: true });
  });
}
