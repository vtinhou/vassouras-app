exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode:405 };

  const { email, password } = JSON.parse(event.body || "{}");

  const USER_EMAIL = "admin@empresa.com";
  const USER_PASSWORD = "12345678";

  if (email === USER_EMAIL && password === USER_PASSWORD) {
    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  }

  return { statusCode:401 };
};