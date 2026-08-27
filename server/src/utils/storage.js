const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const config = require("../config/env");

// Stockage des pièces jointes (photo de la fiche papier) :
//  - Supabase Storage quand SUPABASE_URL / SUPABASE_SERVICE_KEY sont
//    configurés (obligatoire en production — Render n'a pas de disque
//    persistant sur son offre gratuite) ;
//  - disque local (server/uploads) sinon, pour que le dev fonctionne sans
//    compte externe.
const useSupabase = Boolean(config.storage.supabaseUrl && config.storage.supabaseServiceKey);
const LOCAL_DIR = path.resolve(__dirname, "../../uploads");

function randomName(originalName) {
  const ext = (String(originalName || "").match(/\.[a-zA-Z0-9]+$/) || [""])[0].toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

async function uploadFile({ buffer, filename, mimeType, folder = "" }) {
  const objectPath = folder ? `${folder}/${randomName(filename)}` : randomName(filename);

  if (useSupabase) {
    const res = await fetch(
      `${config.storage.supabaseUrl}/storage/v1/object/${config.storage.bucket}/${objectPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.storage.supabaseServiceKey}`,
          apikey: config.storage.supabaseServiceKey,
          "Content-Type": mimeType,
        },
        body: buffer,
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Échec de l'upload Supabase Storage (${res.status}): ${body}`);
    }
    return objectPath;
  }

  fs.mkdirSync(path.join(LOCAL_DIR, folder), { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, objectPath), buffer);
  return objectPath;
}

// URL signée temporaire (1h par défaut) — jamais d'URL publique permanente,
// ces photos peuvent contenir des informations sur des personnes suivies.
async function getSignedUrl(storagePath, expiresIn = 3600) {
  if (!useSupabase) return null; // l'appelant doit alors streamer le fichier local (readLocalFile)
  const res = await fetch(
    `${config.storage.supabaseUrl}/storage/v1/object/sign/${config.storage.bucket}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.storage.supabaseServiceKey}`,
        apikey: config.storage.supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    }
  );
  if (!res.ok) throw new Error("Échec de la génération du lien signé");
  const data = await res.json();
  return `${config.storage.supabaseUrl}/storage/v1${data.signedURL}`;
}

function readLocalFile(storagePath) {
  return fs.readFileSync(path.join(LOCAL_DIR, storagePath));
}

async function removeFile(storagePath) {
  if (useSupabase) {
    await fetch(
      `${config.storage.supabaseUrl}/storage/v1/object/${config.storage.bucket}/${storagePath}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.storage.supabaseServiceKey}`, apikey: config.storage.supabaseServiceKey },
      }
    ).catch(() => {});
    return;
  }
  try {
    fs.unlinkSync(path.join(LOCAL_DIR, storagePath));
  } catch {
    // Already gone — fine.
  }
}

module.exports = { uploadFile, getSignedUrl, readLocalFile, removeFile, useSupabase };
