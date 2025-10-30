// src/utils/azureBlob.ts
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  SASProtocol,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { env } from "../config/env.js";
import fs from "node:fs/promises";
import path from "node:path";

function azureEnabled(): boolean {
  return Boolean(
    env.AZURE_STORAGE_CONNECTION_STRING && env.AZURE_BLOB_CONTAINER
  );
}

function trimTrailingSlash(u: string) {
  return u.replace(/\/+$/, "");
}

async function getContainerClient() {
  const service = BlobServiceClient.fromConnectionString(
    env.AZURE_STORAGE_CONNECTION_STRING as string
  );
  const containerName = String(env.AZURE_BLOB_CONTAINER);
  const container = service.getContainerClient(containerName);

  // Ensure created; do not assume access level changes if it already exists.
  await container.createIfNotExists({
    access: env.AZURE_BLOB_PUBLIC === "true" ? "container" : undefined,
  });
  return container;
}

function isHttpUrl(url?: string) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseConnStringForAccount(): {
  accountName?: string;
  accountKey?: string;
} {
  // Very light parser for the common conn string format
  // AccountName=...;AccountKey=...;
  const out: any = {};
  (env.AZURE_STORAGE_CONNECTION_STRING || "").split(";").forEach((kv) => {
    const [k, v] = kv.split("=");
    if (!k || !v) return;
    if (k === "AccountName") out.accountName = v;
    if (k === "AccountKey") out.accountKey = v;
  });
  return out;
}

/** Uploads a PDF buffer to Azure Blob (if configured) else to /storage (dev fallback). */
export async function uploadPdfBuffer(
  blobKey: string,
  buf: Buffer,
  contentType = "application/pdf"
): Promise<{ url: string; provider: "azure" | "local" }> {
  const safeKey = blobKey.replace(/\\/g, "/");

  if (azureEnabled()) {
    const container = await getContainerClient();
    const blob = container.getBlockBlobClient(safeKey);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    // Base URL (public if container access level is 'container')
    let url = blob.url;

    // If container is private, append a short SAS:
    if (env.AZURE_BLOB_PUBLIC !== "true") {
      const { accountName, accountKey } = parseConnStringForAccount();
      if (accountName && accountKey) {
        const creds = new StorageSharedKeyCredential(accountName, accountKey);
        const sas = generateBlobSASQueryParameters(
          {
            containerName: container.containerName,
            blobName: safeKey,
            protocol: SASProtocol.Https,
            permissions: BlobSASPermissions.parse("r"), // read-only
            startsOn: new Date(Date.now() - 60 * 1000), // valid 1 min in the past to account for clock skew
            expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
          creds
        ).toString();

        url = `${url}?${sas}`;
      }
    }

    if (!isHttpUrl(url)) {
      throw new Error(`Uploader created non-http URL: ${url}`);
    }
    return { url, provider: "azure" };
  }

  // -------- Local fallback --------
  const diskBase = path.join(process.cwd(), "storage");
  await fs.mkdir(diskBase, { recursive: true });
  const safeName = safeKey.replace(/[\\/]+/g, "_"); // flatten dirs
  const filePath = path.join(diskBase, safeName);
  await fs.writeFile(filePath, buf);

  const origin = trimTrailingSlash(
    String(env.APP_ORIGIN || "http://localhost:4000")
  );
  const publicUrl = `${origin}/storage/${encodeURIComponent(safeName)}`;

  if (!isHttpUrl(publicUrl)) {
    throw new Error(`Local publicUrl malformed: ${publicUrl}`);
  }

  return { url: publicUrl, provider: "local" };
}
