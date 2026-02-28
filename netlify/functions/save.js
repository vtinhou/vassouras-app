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

function getConnString() {
  return (
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_CONNECTION_STRING ||
    ""
  );
}

function makePool() {
  const connectionString = getConnString();
  if (!connectionString) throw new Error("MISSING_DATABASE_URL");
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
}

exports.handler = async (event) => {
  try {
    const clientKey =
      event.headers["x-app-key"] ||
      event.headers["X-App-Key"] ||
      event.headers["x-app-key".toLowerCase()];

    if (!process.env.APP_KEY || clientKey !== process.env.APP_KEY) {
      return resp(401, { error: "unauthorized" });
    }

    if (event.httpMethod !== "POST") {
      return resp(405, { error: "method_not_allowed" });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return resp(400, { error: "invalid_json" });
    }

    if (!payload || typeof payload !== "object" || typeof payload.data !== "object") {
      return resp(400, { error: "invalid_payload" });
    }

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
        hint: "Conecte o Netlify DB ao site (ou configure NETLIFY_DATABASE_URL/DATABASE_URL).",
      });
    }
    return resp(500, { error: "server_error" });
  }
};
