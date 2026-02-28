const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_kv (
        k TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);

    const result = await pool.query("SELECT data FROM app_kv WHERE k='app-data'");
    if (!result.rows.length) {
      const initial = {
        clientes: [], fornecedores: [], products: [], bom: [], sales: [], production: [],
        stock: [], purchases: [], finance: [], employees: [], cheques: [], boletos: []
      };
      await pool.query("INSERT INTO app_kv (k, data) VALUES ('app-data', $1)", [initial]);
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ data: initial }) };
    }

    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ data: result.rows[0].data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "load_failed" }) };
  }
};
