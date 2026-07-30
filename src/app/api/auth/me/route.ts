import { getSession } from "@/lib/auth";
import { handle, ok } from "@/lib/http";

export async function GET() {
  return handle(async () => ok({ user: await getSession() }));
}
