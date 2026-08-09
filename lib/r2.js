import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Variável ${name} não configurada.`);
  return value;
}

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

let cachedClient = null;

export function getR2() {
  if (cachedClient) return cachedClient;
  const accountId = required("R2_ACCOUNT_ID");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY")
    }
  });
  return cachedClient;
}

export function bucketName() {
  return required("R2_BUCKET_NAME");
}

export async function putObject(key, body, contentType = "application/octet-stream", metadata = undefined) {
  await getR2().send(new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata
  }));
  return { pathname: key };
}

export async function getObject(key) {
  return getR2().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
}

export async function getObjectBytes(key) {
  const result = await getObject(key);
  if (!result.Body) throw new Error(`Objeto sem conteúdo: ${key}`);
  if (typeof result.Body.transformToByteArray === "function") {
    return result.Body.transformToByteArray();
  }
  const chunks = [];
  for await (const chunk of result.Body) chunks.push(chunk);
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}

export async function deleteObject(key) {
  await getR2().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

export async function deleteObjects(keys) {
  const unique = [...new Set((keys || []).filter(Boolean))];
  if (!unique.length) return;
  for (let i = 0; i < unique.length; i += 1000) {
    const slice = unique.slice(i, i + 1000);
    await getR2().send(new DeleteObjectsCommand({
      Bucket: bucketName(),
      Delete: { Objects: slice.map(Key => ({ Key })), Quiet: true }
    }));
  }
}

export async function listObjects(prefix = "", maxKeys = 200) {
  const result = await getR2().send(new ListObjectsV2Command({
    Bucket: bucketName(),
    Prefix: prefix,
    MaxKeys: Math.max(1, Math.min(1000, Number(maxKeys) || 200))
  }));
  return {
    objects: (result.Contents || []).map(item => ({
      pathname: item.Key,
      size: Number(item.Size || 0),
      uploadedAt: item.LastModified || null,
      etag: item.ETag || ""
    })),
    hasMore: Boolean(result.IsTruncated)
  };
}

export async function objectExists(key) {
  const result = await listObjects(key, 5);
  return result.objects.some(item => item.pathname === key);
}

export async function signedGetUrl(key, expiresIn = 900) {
  return getSignedUrl(
    getR2(),
    new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    { expiresIn: Math.max(30, Math.min(3600, Number(expiresIn) || 900)) }
  );
}
