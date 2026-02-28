
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

exports.handler = async (event) => {
    if(event.httpMethod !== "POST"){
        return resp(405,{error:"method_not_allowed"});
    }

    try{
        const payload = JSON.parse(event.body);
        const p = pool();
        const client = await p.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS app_data(
                id INT PRIMARY KEY,
                data JSONB NOT NULL
            )
        `);

        await client.query(`
            INSERT INTO app_data (id,data)
            VALUES (1,$1)
            ON CONFLICT (id)
            DO UPDATE SET data = $1
        `,[payload.data]);

        return resp(200,{ ok:true });
    }catch(e){
        return resp(500,{ error:"server_error" });
    }
};
