import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ATTEMPTS_STORE,
  openQuizLabDatabase,
  QUESTIONS_STORE,
  QUIZLAB_DB_NAME,
  QUIZZES_STORE,
} from './quizlab.database';

const openConnections: IDBDatabase[] = [];

async function openDatabase(): Promise<IDBDatabase> {
  const db = await openQuizLabDatabase();
  openConnections.push(db);
  return db;
}

afterEach(() => {
  for (const db of openConnections.splice(0)) {
    db.close();
  }
});

describe('QuizLab IndexedDB schema', () => {
  it('creates all three object stores', async () => {
    const db = await openDatabase();

    expect(db.name).toBe(QUIZLAB_DB_NAME);
    expect(db.objectStoreNames.contains(QUIZZES_STORE)).toBe(true);
    expect(db.objectStoreNames.contains(QUESTIONS_STORE)).toBe(true);
    expect(db.objectStoreNames.contains(ATTEMPTS_STORE)).toBe(true);
  });

  it('creates the quiz indexes', async () => {
    const db = await openDatabase();
    const transaction = db.transaction(QUIZZES_STORE, 'readonly');
    const store = transaction.objectStore(QUIZZES_STORE);

    expect(store.indexNames.contains('source')).toBe(true);
    expect(store.indexNames.contains('status')).toBe(true);
    expect(store.indexNames.contains('updatedAt')).toBe(true);
  });

  it('creates the question indexes', async () => {
    const db = await openDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readonly');
    const store = transaction.objectStore(QUESTIONS_STORE);

    expect(store.indexNames.contains('quizId')).toBe(true);
    expect(store.indexNames.contains('quizCategoryDifficulty')).toBe(true);
    expect(store.index('quizCategoryDifficulty').keyPath).toEqual([
      'quizId',
      'category',
      'difficulty',
    ]);
  });

  it('creates the attempt indexes', async () => {
    const db = await openDatabase();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readonly');
    const store = transaction.objectStore(ATTEMPTS_STORE);

    expect(store.indexNames.contains('quizId')).toBe(true);
    expect(store.indexNames.contains('status')).toBe(true);
    expect(store.indexNames.contains('startedAt')).toBe(true);
  });

  it('opens the existing database again without changing its schema', async () => {
    const first = await openDatabase();
    const firstStoreNames = Array.from(first.objectStoreNames).sort();

    const second = await openDatabase();

    expect(Array.from(second.objectStoreNames).sort()).toEqual(firstStoreNames);
    expect(second.version).toBe(first.version);
  });

  it('closes a database that opens after the request was blocked', async () => {
    const database = {
      close: vi.fn(),
    } as unknown as IDBDatabase;

    const request = {
      result: database,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    } as unknown as IDBOpenDBRequest;

    vi.spyOn(indexedDB, 'open').mockReturnValue(request);

    const opening = openQuizLabDatabase();

    request.onblocked?.(new Event('blocked') as IDBVersionChangeEvent);

    await expect(opening).rejects.toThrow(
      'Opening QuizLab database is blocked by another connection.',
    );

    request.onsuccess?.(new Event('success'));

    expect(database.close).toHaveBeenCalledOnce();
  });
  it('rejects when IndexedDB is unavailable', async () => {
    const originalIndexedDB = globalThis.indexedDB;

    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    });

    try {
      await expect(openQuizLabDatabase()).rejects.toThrow(
        'IndexedDB is unavailable in this environment.',
      );
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        value: originalIndexedDB,
      });
    }
  });
});
