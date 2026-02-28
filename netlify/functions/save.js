const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "method_not_allowed" }) };
    }

    const payload = JSON.parse(event.body || "{}");
    const data = payload.data || {};

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_kv (
        k TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);

    await pool.query(
      `INSERT INTO app_kv (k, data) VALUES ('app-data', $1)
       ON CONFLICT (k) DO UPDATE SET data = EXCLUDED.data`,
      [data]
    );

    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "save_failed" }) };
  }
};
