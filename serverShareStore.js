import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SHARE_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_SHARE_STORAGE_DIR = path.join(__dirname, '.onefour-share-data');

function resolveShareTtlSeconds() {
  const rawValue = Number(process.env.ONEFOUR_SHARE_TTL_SECONDS);

  if (Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue;
  }

  return DEFAULT_SHARE_TTL_SECONDS;
}

function resolveShareStorageDir() {
  return process.env.ONEFOUR_SHARE_STORAGE_DIR || DEFAULT_SHARE_STORAGE_DIR;
}

function getShareFilePath(shareId) {
  return path.join(resolveShareStorageDir(), `${shareId}.json`);
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
  return `{${entries
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
    .join(',')}}`;
}

async function ensureShareStorageDir() {
  const storageDir = resolveShareStorageDir();
  await mkdir(storageDir, { recursive: true });
  return storageDir;
}

function isValidShareMode(mode) {
  return mode === 'single' || mode === 'bulk';
}

function isValidShareStatus(status) {
  return status === 'success' || status === 'error';
}

function normalizeSharePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalized = payload;

  if (typeof normalized.query !== 'string' || !normalized.query.trim()) {
    return null;
  }

  if (!isValidShareMode(normalized.mode) || !isValidShareStatus(normalized.status)) {
    return null;
  }

  return {
    mode: normalized.mode,
    query: normalized.query.trim(),
    status: normalized.status,
    responseTime: typeof normalized.responseTime === 'number' ? normalized.responseTime : undefined,
    source: typeof normalized.source === 'string' ? normalized.source : undefined,
    cached: typeof normalized.cached === 'boolean' ? normalized.cached : undefined,
    error: typeof normalized.error === 'string' ? normalized.error : undefined,
    rawData: normalized.rawData,
    rawWhoisContent:
      typeof normalized.rawWhoisContent === 'string' ? normalized.rawWhoisContent : undefined,
    result: normalized.result,
    bulkResult: normalized.bulkResult,
  };
}

export async function cleanupExpiredShares() {
  const storageDir = await ensureShareStorageDir();
  const now = Date.now();
  const fileNames = await readdir(storageDir);

  await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith('.json'))
      .map(async (fileName) => {
        const filePath = path.join(storageDir, fileName);

        try {
          const content = await readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          if (typeof data?.expiresAt !== 'number' || data.expiresAt <= now) {
            await rm(filePath, { force: true });
          }
        } catch {
          await rm(filePath, { force: true });
        }
      })
  );
}

export async function createStoredShare(payload) {
  const normalizedPayload = normalizeSharePayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  await cleanupExpiredShares();

  const now = Date.now();
  const payloadHash = createHash('sha256').update(stableStringify(normalizedPayload)).digest('hex');
  const shareId = payloadHash.slice(0, 32);
  const ttlMs = resolveShareTtlSeconds() * 1000;
  const storedShare = {
    id: shareId,
    createdAt: now,
    expiresAt: now + ttlMs,
    ...normalizedPayload,
  };

  await writeFile(getShareFilePath(shareId), JSON.stringify(storedShare), 'utf8');

  return storedShare;
}

export async function getStoredShare(shareId) {
  if (!shareId || typeof shareId !== 'string') {
    return { kind: 'missing' };
  }

  const filePath = getShareFilePath(shareId);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      return { kind: 'missing' };
    }
  } catch {
    return { kind: 'missing' };
  }

  try {
    const content = await readFile(filePath, 'utf8');
    const storedShare = JSON.parse(content);

    if (typeof storedShare?.expiresAt !== 'number') {
      await rm(filePath, { force: true });
      return { kind: 'missing' };
    }

    if (storedShare.expiresAt <= Date.now()) {
      await rm(filePath, { force: true });
      return { kind: 'expired' };
    }

    return { kind: 'ok', data: storedShare };
  } catch {
    return { kind: 'missing' };
  }
}
