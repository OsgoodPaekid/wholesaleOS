import { clearSession } from "@/lib/auth";
import { handle, ok } from "@/lib/http";

export async function POST() {
  return handle(async () => {
    await clearSession();
    return ok({ success: true });
  });
}
