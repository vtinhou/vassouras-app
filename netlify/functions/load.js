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

function emptyData() {
  const keys = [
    "clientes","fornecedores","products","bom","sales","production",
    "stock","purchases","finance","employees","cheques","boletos",
  ];
  const d = {};
  for (const k of keys) d[k] = [];
  return d;
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

    const pool = makePool();
    const client = await pool.connect();
    try {
      await client.query(TABLE_SQL);

      const { rows } = await client.query(
        "SELECT data, version, updated_at FROM app_kv WHERE k = $1",
        ["app-data"]
      );

      if (!rows.length) {
        const initial = { data: emptyData(), meta: { version: 0, updatedAt: null } };
        await client.query(
          "INSERT INTO app_kv (k, data, version, updated_at) VALUES ($1, $2, $3, NOW())",
          ["app-data", initial.data, 0]
        );
        return resp(200, initial);
      }

      const row = rows[0];
      return resp(200, {
        data: row.data,
        meta: {
          version: row.version ?? 0,
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        },
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error("LOAD_ERROR", e);
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
