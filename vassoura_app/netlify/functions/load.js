const { getStore } = require("@netlify/blobs");

const STORE_NAME = "vassouras-db";
const OBJECT_KEY = "app-data";
const KEYS = [
  "clientes", "fornecedores", "products", "bom", "sales", "production",
  "stock", "purchases", "finance", "employees", "cheques", "boletos"
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function getHeader(event, name) {
  const h = event.headers || {};
  const key = Object.keys(h).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? h[key] : undefined;
}

function emptyData() {
  const d = {};
  for (const k of KEYS) d[k] = [];
  return d;
}

exports.handler = async (event) => {
  // Segurança simples por senha (token)
  const clientKey = getHeader(event, "x-app-key");
  if (!process.env.APP_KEY || clientKey !== process.env.APP_KEY) {
    return json(401, { error: "unauthorized" });
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    const saved = await store.get(OBJECT_KEY, { type: "json", consistency: "strong" });

    if (!saved) {
      const initial = { data: emptyData(), meta: { version: 0, updatedAt: null } };
      await store.setJSON(OBJECT_KEY, initial);
      return json(200, initial);
    }

    const data = saved.data || emptyData();
    for (const k of KEYS) if (!Array.isArray(data[k])) data[k] = [];

    return json(200, { data, meta: saved.meta || { version: 0, updatedAt: null } });
  } catch (e) {
    console.error("LOAD_ERROR", e);
    return json(500, { error: "server_error" });
  }
};
