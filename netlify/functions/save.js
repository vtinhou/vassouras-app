const { Pool } = require("pg");

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_kv (
  k TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

function connString() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
}

function makePool() {
  const cs = connString();
  if (!cs) throw new Error("MISSING_DATABASE_URL");
  return new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 1 });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "method_not_allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return resp(400, { error: "invalid_json" });
  }
  if (!payload || typeof payload.data !== "object") {
    return resp(400, { error: "invalid_payload" });
  }

  try {
    const pool = makePool();
    const client = await pool.connect();
    try {
      await client.query(TABLE_SQL);
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
      const row = rows[0] || {};
      return resp(200, {
        ok: true,
        meta: {
          version: row.version ?? null,
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        },
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error("SAVE_ERROR", e);
    const msg = String(e && e.message ? e.message : e);
    if (msg === "MISSING_DATABASE_URL") {
      return resp(500, {
        error: "missing_database_url",
        hint: "Crie/conecte o Netlify DB ao site para gerar NETLIFY_DATABASE_URL e faça redeploy."
      });
    }
    return resp(500, { error: "server_error" });
  }
};
