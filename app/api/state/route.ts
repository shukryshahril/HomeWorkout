import { connection } from "next/server";
import { respond } from "@/lib/server/respond";
import { getState } from "@/lib/server/store";

export async function GET() {
  // SQLite reads are synchronous, so opt out of prerendering explicitly.
  await connection();
  return respond(getState);
}
