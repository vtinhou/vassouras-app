const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized:false }
});

exports.handler = async (event) => {

  const { data } = JSON.parse(event.body);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB
    )
  `);

  await pool.query(`
    INSERT INTO app_data (id,data)
    VALUES (1,$1)
    ON CONFLICT (id)
    DO UPDATE SET data=$1
  `,[data]);

  return { statusCode:200 };
};