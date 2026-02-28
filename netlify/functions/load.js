const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized:false }
});

exports.handler = async () => {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB
    )
  `);

  const result = await pool.query("SELECT data FROM app_data WHERE id=1");

  if (!result.rows.length) {
    const initial = { clientes: [] };
    await pool.query("INSERT INTO app_data (id,data) VALUES (1,$1)", [initial]);
    return { statusCode:200, body: JSON.stringify({ data:initial }) };
  }

  return { statusCode:200, body: JSON.stringify({ data: result.rows[0].data }) };
};