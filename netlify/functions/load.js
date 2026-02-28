
const { Pool } = require("pg");

function resp(statusCode,obj){
    return {
        statusCode,
        headers:{ "content-type":"application/json" },
        body: JSON.stringify(obj)
    };
}

function pool(){
    return new Pool({
        connectionString: process.env.NETLIFY_DATABASE_URL,
        ssl:{ rejectUnauthorized:false }
    });
}

exports.handler = async () => {
    try{
        const p = pool();
        const client = await p.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_data(
                id INT PRIMARY KEY,
                data JSONB NOT NULL
            )
        `);
        const { rows } = await client.query("SELECT data FROM app_data WHERE id=1");
        if(rows.length === 0){
            const initial = { clientes:[] };
            await client.query("INSERT INTO app_data (id,data) VALUES (1,$1)",[initial]);
            return resp(200,{ data: initial });
        }
        return resp(200,{ data: rows[0].data });
    }catch(e){
        return resp(500,{ error:"server_error" });
    }
};
