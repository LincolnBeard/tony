/* =====================================================================
   VERCEL FUNCTION — POST /actions (rewritten from /actions, see
   vercel.json). This is the serverless shell of the demo host; all
   logic is shared with the standalone Bun server via
   server/src/host.ts — database, schema, demo-mode ctx, dispatch.

   Runtime: vercel.json sets "bunVersion": "1.x", so Vercel runs this
   function on the Bun runtime (public beta) in place of Node.js —
   the whole stack is Bun-native (the project's packageManager is
   bun, the client build is a Bun.build script, and @libsql/client
   talks to the remote database over HTTPS/WSS, which Bun supports
   natively). The handler below is a Web-standard fetch handler,
   which both runtimes accept. If the beta Bun runtime ever
   misbehaves, deleting "bunVersion" from vercel.json falls back to
   plain Node.js with no code change.

   Database: a REMOTE libsql (Turso) database via env vars
   DATABASE_URL + DATABASE_AUTH_TOKEN — a serverless function has no
   durable local disk, so the standalone server's file DB cannot work
   here. Cold starts open the connection lazily (cached per warm
   instance), apply the migrations only if the tables are absent,
   and the actions' ensure* functions then seed the demo vault on
   first read. See README → Deploying → Vercel.
   ===================================================================== */

import { getDb, handleActionsRequest } from "../server/src/host";

export const config = {
  // Bun swaps in transparently when "bunVersion" is set (see header).
  runtime: "nodejs",
  // Seeding a brand-new database (schema + demo seed inserts) happens
  // inside the first getPortfolio call; give cold starts headroom
  // within the Hobby tier's cap.
  maxDuration: 60,
};

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const { db } = await getDb();
    return handleActionsRequest(req, db);
  },
};
