export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const data = await request.json();

      const recordKey = data.recordKey;
      const fullPath = data.fullPath;
      let cleanFilename = data.cleanFilename;

      if (!recordKey || !fullPath || !cleanFilename) {
        return new Response("Error: Missing data", { status: 400 });
      }

      // Converti _jpg in .jpg
      cleanFilename = cleanFilename.replace(/_jpg$/, ".jpg");

      // 1️⃣ Scarica l'immagine da Drive
      const imageResp = await fetch(fullPath);
      if (!imageResp.ok) {
        return new Response(`Errore scaricando immagine: ${imageResp.statusText}`, { status: 500 });
      }
      const imageBuffer = await imageResp.arrayBuffer();

      // 2️⃣ Prendi il token Sirv
      const sirvTokenResp = await fetch(env.SIRV_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: env.SIRV_CLIENT_ID,
          clientSecret: env.SIRV_CLIENT_SECRET
        })
      });

      if (!sirvTokenResp.ok) {
        return new Response("Errore autenticazione Sirv", { status: 500 });
      }

      const sirvData = await sirvTokenResp.json();
      const sirvToken = sirvData.token;

      // 3️⃣ Upload su Sirv
      const uploadResp = await fetch(`https://api.sirv.com/v2/files/${cleanFilename}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${sirvToken}`,
          "Content-Type": "image/jpeg"
        },
        body: imageBuffer
      });

      if (!uploadResp.ok) {
        return new Response(`Errore upload su Sirv: ${uploadResp.statusText}`, { status: 500 });
      }

      return new Response("OK", { status: 200 });

    } catch (err) {
      return new Response("Errore: " + err.toString(), { status: 500 });
    }
  }
};
