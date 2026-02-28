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

function emptyData() {
  const keys = ["clientes","fornecedores","products","bom","sales","production","stock","purchases","finance","employees","cheques","boletos"];
  const d = {};
  for (const k of keys) d[k] = [];
  return d;
}

exports.handler = async () => {
  try {
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

      const { rows } = await client.query("SELECT data, version, updated_at FROM app_kv WHERE k=$1", ["app-data"]);
      if (!rows.length) {
        const initial = { data: emptyData(), meta: { version: 0, updatedAt: null } };
        await client.query("INSERT INTO app_kv (k, data, version, updated_at) VALUES ($1, $2, 0, NOW())", ["app-data", initial.data]);
        return resp(200, initial);
      }

      const r = rows[0];
      return resp(200, {
        data: r.data,
        meta: { version: r.version ?? 0, updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null },
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error("LOAD_ERROR", e);
    return resp(500, { error: "server_error" });
  }
};
