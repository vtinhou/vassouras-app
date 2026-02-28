const { Pool } = require("pg");

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

function makePool() {
  const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("MISSING_DATABASE_URL");
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1 });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "method_not_allowed" });

  try {
    const payload = JSON.parse(event.body || "{}");
    if (!payload || typeof payload.data !== "object") return resp(400, { error: "invalid_payload" });

    const pool = makePool();
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_kv (
          k TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          version INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const { rows } = await client.query(
        `
        INSERT INTO app_kv (k, data, version, updated_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (k) DO UPDATE
          SET data = EXCLUDED.data,
              version = app_kv.version + 1,
              updated_at = NOW()
        RETURNING version, updated_at
        `,
        ["app-data", payload.data]
      );

      const r = rows[0] || {};
      return resp(200, { ok: true, meta: { version: r.version ?? null, updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null } });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error("SAVE_ERROR", e);
    return resp(500, { error: "server_error" });
  }
};
