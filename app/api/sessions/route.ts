import { respond } from "@/lib/server/respond";
import { clearDay, recordSession } from "@/lib/server/store";

export async function POST(request: Request) {
  return respond(async () => recordSession(await request.json()));
}

export async function DELETE(request: Request) {
  return respond(async () => clearDay(await request.json()));
}
