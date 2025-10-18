import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "../config/env.js";
import fs from "node:fs/promises";
import path from "node:path";

function azureEnabled(): boolean {
  return Boolean(
    env.AZURE_STORAGE_CONNECTION_STRING && env.AZURE_BLOB_CONTAINER
  );
}

async function getContainerClient() {
  // Create the client lazily — never at module top!
  const service = BlobServiceClient.fromConnectionString(
    env.AZURE_STORAGE_CONNECTION_STRING as string
  );
  const container = service.getContainerClient(
    env.AZURE_BLOB_CONTAINER as string
  );
  await container.createIfNotExists({ access: "container" }); // or omit to keep private
  return container;
}

/**
 * Upload a PDF buffer to Azure Blob if configured; otherwise write to local /storage.
 * Returns a URL you can store/send.
 */
export async function uploadPdfBuffer(
  blobKey: string,
  buf: Buffer,
  contentType = "application/pdf"
): Promise<{ url: string; provider: "azure" | "local" }> {
  if (azureEnabled()) {
    const container = await getContainerClient();
    // Normalize blob key (avoid accidental backslashes on Windows)
    const safeKey = blobKey.replace(/\\/g, "/");
    const blob = container.getBlockBlobClient(safeKey);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return { url: blob.url, provider: "azure" };
  }

  // Local fallback for dev: /storage/contracts/...
  const base = path.join(process.cwd(), "storage");
  await fs.mkdir(base, { recursive: true });
  const safeName = blobKey.replace(/[\\/]+/g, "_");
  const filePath = path.join(base, safeName);
  await fs.writeFile(filePath, buf);
  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
  return { url: fileUrl, provider: "local" };
}
