import { respond } from "@/lib/server/respond";
import { saveSettings } from "@/lib/server/store";

export async function PATCH(request: Request) {
  return respond(async () => saveSettings(await request.json()));
}
