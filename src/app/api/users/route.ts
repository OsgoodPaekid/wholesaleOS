import { prisma } from "@/lib/prisma";
import { handle, ok, requireAdmin } from "@/lib/http";
import { userCreateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

// Fields safe to send to the browser — never the password hash.
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

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok(
      await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "asc" } })
    );
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const data = userCreateSchema.parse(await req.json());
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: await hashPassword(data.password),
      },
      select: publicUser,
    });
    return ok(user, 201);
  });
}
