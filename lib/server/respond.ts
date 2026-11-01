import { BackupError, InputError } from "./store";

// Runs a store call and maps validation failures to 400s.
export async function respond(work: () => unknown | Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await work());
  } catch (error) {
    if (error instanceof InputError || error instanceof BackupError || error instanceof SyntaxError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Something went wrong saving your data." }, { status: 500 });
  }
}
