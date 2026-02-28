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

function emptyData() {
  const keys = [
    "clientes","fornecedores","products","bom","sales","production",
    "stock","purchases","finance","employees","cheques","boletos"
  ];
  const d = {};
  for (const k of keys) d[k] = [];
  return d;
}

exports.handler = async () => {
  try {
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
        hint: "Crie/conecte o Netlify DB ao site para gerar NETLIFY_DATABASE_URL e faça redeploy."
      });
    }
    return resp(500, { error: "server_error" });
  }
};
