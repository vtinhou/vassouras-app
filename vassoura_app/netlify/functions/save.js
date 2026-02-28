const { getStore } = require("@netlify/blobs");

const STORE_NAME = "vassouras-db";
const OBJECT_KEY = "app-data";

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

exports.handler = async (event) => {
  const clientKey = getHeader(event, "x-app-key");
  if (!process.env.APP_KEY || clientKey !== process.env.APP_KEY) {
    return json(401, { error: "unauthorized" });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (!payload || typeof payload !== "object" || typeof payload.data !== "object") {
    return json(400, { error: "invalid_payload" });
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    const current = await store.get(OBJECT_KEY, { type: "json", consistency: "strong" });
    const nextVersion = ((current && current.meta && current.meta.version) ? current.meta.version : 0) + 1;

    const now = new Date().toISOString();
    const toSave = { data: payload.data, meta: { version: nextVersion, updatedAt: now } };

    await store.setJSON(OBJECT_KEY, toSave);

    return json(200, { ok: true, meta: toSave.meta });
  } catch (e) {
    console.error("SAVE_ERROR", e);
    return json(500, { error: "server_error" });
  }
};
