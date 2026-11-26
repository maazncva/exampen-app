import crypto from "crypto";

// PDFs for courses live in a Bunny *Storage* zone (Bunny Stream only takes
// video). The storage zone is private: files are only reachable through its
// connected Pull Zone, which has Token Authentication turned on, so a link
// only works if this server signed it.
//
// Env vars (all server-side only):
//   BUNNY_STORAGE_ZONE      - storage zone name, e.g. "exampen-pdfs"
//   BUNNY_STORAGE_PASSWORD  - storage zone > FTP & API Access > Password
//   BUNNY_STORAGE_HOST      - storage zone > FTP & API Access > Hostname
//                             (defaults to storage.bunnycdn.com)
//   BUNNY_PDF_PULL_ZONE     - hostname of the pull zone connected to the
//                             storage zone, e.g. "exampen-pdfs.b-cdn.net"
//   BUNNY_PDF_TOKEN_KEY     - that pull zone > Security > Token Authentication key

const MAX_FOLDER_DEPTH = 3;

function storageConfig() {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  const host = process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
  if (!zone || !password) {
    throw new Error("Bunny Storage isn't configured — set BUNNY_STORAGE_ZONE and BUNNY_STORAGE_PASSWORD");
  }
  return { zone, password, host };
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function listFolder(cfg, folder) {
  const url = `https://${cfg.host}/${cfg.zone}/${folder ? encodePath(folder) + "/" : ""}`;
  const res = await fetch(url, {
    headers: { AccessKey: cfg.password, accept: "application/json" },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Bunny Storage API error: ${res.status}`);
  return res.json();
}

// Lists every PDF in the storage zone (including inside folders, up to 3
// levels deep), so the admin panel can show them without typing any paths.
export async function listBunnyPdfs() {
  const cfg = storageConfig();
  const pdfs = [];

  async function walk(folder, depth) {
    const items = await listFolder(cfg, folder);
    for (const item of items) {
      const path = folder ? `${folder}/${item.ObjectName}` : item.ObjectName;
      if (item.IsDirectory) {
        if (depth < MAX_FOLDER_DEPTH) await walk(path, depth + 1);
      } else if (item.ObjectName.toLowerCase().endsWith(".pdf")) {
        pdfs.push({
          path,
          folder: folder || "",
          title: item.ObjectName.replace(/\.pdf$/i, ""),
          sizeBytes: item.Length,
          lastChanged: item.LastChanged
        });
      }
    }
  }

  await walk("", 0);
  pdfs.sort((a, b) => (b.lastChanged || "").localeCompare(a.lastChanged || ""));
  return pdfs;
}

// Builds a short-lived signed URL for one PDF, using Bunny CDN token
// authentication. Only ever called from a server route AFTER checking in the
// database that this user is enrolled in the course the PDF belongs to.
// The viewer downloads the file straight away, so the link only needs to
// live for a few minutes.
export function getSignedPdfUrl(storagePath, expiresInSeconds = 60 * 10) {
  const pullZone = process.env.BUNNY_PDF_PULL_ZONE;
  const securityKey = process.env.BUNNY_PDF_TOKEN_KEY;
  if (!pullZone || !securityKey) {
    throw new Error("Bunny PDF delivery isn't configured — set BUNNY_PDF_PULL_ZONE and BUNNY_PDF_TOKEN_KEY");
  }

  const signaturePath = "/" + storagePath.replace(/^\/+/, "");
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token = crypto
    .createHash("sha256")
    .update(securityKey + signaturePath + expires)
    .digest("base64")
    .replace(/\n/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `https://${pullZone}${encodePath(signaturePath)}?token=${token}&expires=${expires}`;
}
