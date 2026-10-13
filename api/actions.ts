/* =====================================================================
   VERCEL FUNCTION — POST /actions (rewritten from /actions, see
   vercel.json). This is the serverless shell of the demo host; all
   logic is shared with the standalone Bun server via
   server/src/host.ts — database, schema, demo-mode ctx, dispatch.

   Runtime: Vercel's standard Node.js runtime. (An earlier version
   pinned Vercel's Bun public-beta runtime via "bunVersion" in
   vercel.json while ALSO declaring runtime: "nodejs" in this file's
   config — a contradictory pair, and the beta runtime is a variable
   a demo doesn't need. bunVersion is gone; Node is the default and
   the only runtime this file asks for. Bun is still the package
   manager and still builds the client — that's build-time, and the
   build image supplies it.)

   Handler shape: Web-standard method exports (`POST`), the shape
   Vercel's Node runtime documents for api/*.ts functions. NOT the
   previous `export default { fetch }` object — that is the
   Bun.serve/worker shape, which Vercel's Node runtime does not
   dispatch to; the function failed before any handler code ran.

   NEVER DIE SILENTLY: this module imports NOTHING at top level.
   The whole host graph (actions, SDK, DB drivers) loads through a
   dynamic import INSIDE the handler's try/catch, so a failure at
   module-init time in that graph — an unresolvable import, a native
   addon that didn't survive bundling, a driver that throws on load
   — becomes a rejected promise here and is reported to the caller
   as JSON { error: { name, message } } with HTTP 500, instead of
   Vercel's opaque plain-text 500 with the real cause visible
   nowhere. Database connect/migration failures inside getDb()
   take the same path. The error body carries the error's name and
   message only — no stack trace, no env values, no credentials
   (@libsql/client's own messages, e.g. auth or URL errors, are
   exactly the diagnosis this exists to surface). The success
   contract is unchanged: { data } on 200, the dispatcher's own
   { error: string } on 404 (unknown action) / 400 (invalid args)
   / action-level 500s.

   The one failure class this cannot report is the module failing
   to load before evaluation — this file itself cannot load (it has
   no imports and no top-level statements beyond the config export
   and function declarations, so there is almost nothing here TO
   fail), or Vercel never routing to it at all.

   Database: a REMOTE libsql (Turso) database via env vars
   DATABASE_URL + DATABASE_AUTH_TOKEN — a serverless function has no
   durable local disk, so the standalone server's file DB cannot work
   here. Cold starts open the connection lazily (cached per warm
   instance), apply the migrations only if the tables are absent,
   and the actions' ensure* functions then seed the demo vault on
   first read. See README → Deploying → Vercel.
   ===================================================================== */

export const config = {
  // Seeding a brand-new database (schema + demo seed inserts) happens
  // inside the first getPortfolio call; give cold starts headroom
  // within the Hobby tier's cap. Runtime is Vercel's Node.js default.
  maxDuration: 60,
};

/* Deliberately self-contained (no import from host.ts): if loading
   the host graph is itself what failed, the error shaper must not
   depend on it. Name + message only — never a stack, never env. */
function errorResponse(e: unknown): Response {
  const name = e instanceof Error ? e.name : "Error";
  let message = e instanceof Error ? e.message : String(e);
  // Unwrap one level of `cause`: fetch/libsql errors bury the useful
  // part (DNS failure, connection refused, HTTP status) there. Cause
  // messages carry hostnames/system errors — never credentials.
  const cause = (e as { cause?: unknown } | null)?.cause;
  if (cause instanceof Error && cause.message && cause.message !== message) {
    message = `${message} (cause: ${cause.message})`;
  }
  console.error(`[api/actions] ${name}: ${message}`);
  return Response.json({ error: { name, message } }, { status: 500 });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { getDb, handleActionsRequest } = await import("../server/src/host");
    const { db } = await getDb();
    return await handleActionsRequest(req, db);
  } catch (e) {
    return errorResponse(e);
  }
}

export function GET(): Response {
  return Response.json(
    { error: "method not allowed — POST {action, args} to this endpoint" },
    { status: 405 },
  );
}
