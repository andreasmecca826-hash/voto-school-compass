import type { AppNotification } from "./types";

const DB_NAME = "voto-circular-index";
const STORE_NAME = "documents";
const DB_VERSION = 1;

export interface CircularIndexEntry {
  id: string;
  title: string;
  date?: string;
  searchableText: string;
  pages: number;
  hasTables: boolean;
  updatedAt: string;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function indexedEntry(notification: AppNotification): CircularIndexEntry {
  const searchableText = normalize(
    [
      notification.title,
      notification.subject,
      notification.message,
      notification.extractedText,
      notification.attachmentName,
      ...(notification.attachments ?? []).flatMap((attachment) => [attachment.name]),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const pages = notification.extractedText?.match(/^\[Pagina\s+\d+\]$/gim)?.length ?? 0;
  return {
    id: notification.id,
    title: notification.title,
    ...(notification.date ? { date: notification.date } : {}),
    searchableText,
    pages,
    hasTables: notification.hasTables === true || (notification.tableCount ?? 0) > 0,
    updatedAt: new Date().toISOString(),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_open_failed"));
  });
}

export async function indexCircularNotifications(notifications: AppNotification[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      notifications
        .filter((item) => item.type === "notice")
        .forEach((item) => store.put(indexedEntry(item)));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb_write_failed"));
    });
  } finally {
    database.close();
  }
}

export async function searchCircularIndex(query: string): Promise<CircularIndexEntry[]> {
  if (typeof indexedDB === "undefined") return [];
  const normalized = normalize(query);
  if (!normalized) return [];
  const database = await openDatabase();
  try {
    return await new Promise<CircularIndexEntry[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const terms = normalized.split(" ").filter((term) => term.length >= 2);
        resolve(
          (request.result as CircularIndexEntry[])
            .filter((entry) => terms.every((term) => entry.searchableText.includes(term)))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        );
      };
      request.onerror = () => reject(request.error ?? new Error("indexeddb_read_failed"));
    });
  } finally {
    database.close();
  }
}
