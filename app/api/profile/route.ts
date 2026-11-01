import { respond } from "@/lib/server/respond";
import { saveProfile } from "@/lib/server/store";

export async function PATCH(request: Request) {
  return respond(async () => saveProfile(await request.json()));
}
