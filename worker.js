export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch (err) {
      return new Response("Errore parsing JSON: " + err.toString(), { status: 400 });
    }

    const recordKey = data?.recordKey;
    const cleanFilename = data?.cleanFilename?.replace(/_png$/, ".png").replace(/_jpg$/, ".jpg");

    if (!recordKey || !cleanFilename) {
      return new Response("Error: Missing data", { status: 400 });
    }

    try {
      // Richiedi il token JWT a Sirv
      const tokenResp = await fetch(env.SIRV_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: env.SIRV_CLIENT_ID,
          clientSecret: env.SIRV_CLIENT_SECRET
        })
      });

      if (!tokenResp.ok) {
        return new Response("Errore autenticazione Sirv", { status: 500 });
      }

      const tokenData = await tokenResp.json();
      const sirvToken = tokenData.token;

      // Genera l'URL di upload diretto su Sirv
      const uploadUrl = `${env.SIRV_UPLOAD_URL}/${cleanFilename}`;

      // Restituisci al client AppSheet il token e l'URL
      return new Response(JSON.stringify({
        recordKey,
        uploadUrl,
        headers: {
          "Authorization": `Bearer ${sirvToken}`,
          "Content-Type": "image/jpeg" // AppSheet dovrà impostare questo quando fa PUT
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response("Errore Worker: " + err.toString(), { status: 500 });
    }
  }
};
