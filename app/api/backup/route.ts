import { connection } from "next/server";
import { respond } from "@/lib/server/respond";
import { makeBackup, restoreBackup } from "@/lib/server/store";

export async function GET() {
  await connection();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(makeBackup(), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="HomeWorkout-backup-${day}.json"`,
    },
  });
}

export async function POST(request: Request) {
  return respond(async () => restoreBackup(await request.json()));
}
