import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return fail("Wrong email or password.", 401);
    }
    if (!user.active) {
      return fail("Your account is disabled. Contact your administrator.", 403);
    }
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
  });
}
