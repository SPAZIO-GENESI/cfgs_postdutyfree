export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let data;
    try {
      // Legge il body come testo
      const textBody = await request.text();
      console.log("Body ricevuto:", textBody);

      // Parse JSON
      data = JSON.parse(textBody);
    } catch (err) {
      return new Response("Errore parsing JSON: " + err.toString(), { status: 400 });
    }

    // Controllo dei campi obbligatori
    const recordKey = data?.recordKey;
    const fullPath = data?.fullPath;
    let cleanFilename = data?.cleanFilename;

    console.log("Dati estratti:", { recordKey, fullPath, cleanFilename });
    

    if (!recordKey) return new Response("Missing recordKey", { status: 400 });
    if (!fullPath) return new Response("Missing fullPath", { status: 400 });
    if (!cleanFilename) return new Response("Missing cleanFilename", { status: 400 });

    // Correzione estensione
    cleanFilename = cleanFilename.replace(/_png$/, ".png").replace(/_jpg$/, ".jpg");

    try {
      // 1️⃣ Scarica immagine da Drive
      const imageResp = await fetch(fullPath);
      if (!imageResp.ok) {
        return new Response(`Errore scaricando immagine: ${imageResp.statusText}`, { status: 500 });
      }
      const imageBuffer = await imageResp.arrayBuffer();

      // 2️⃣ Ottieni token Sirv
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
      console.error("Errore Worker:", err);
      return new Response("Errore: " + err.toString(), { status: 500 });
    }
  }
};
