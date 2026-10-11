import { prisma } from "@/lib/prisma";
import { handle, ok, requireUser } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ body: z.string().trim().min(1, "Write something first").max(2000) });

export async function GET() {
  return handle(async () => {
    await requireUser();
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok(notes);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { body } = schema.parse(await req.json());
    const note = await prisma.note.create({
      data: { body, createdById: user.userId, createdByName: user.name },
    });
    return ok(note, 201);
  });
}
