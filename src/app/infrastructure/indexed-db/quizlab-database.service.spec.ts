import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { QuizLabDatabaseService } from './quizlab-database.service';

describe('QuizLabDatabaseService', () => {
  it('reuses the same database connection', async () => {
    const service = new QuizLabDatabaseService();

    const firstPromise = service.getDatabase();
    const secondPromise = service.getDatabase();

    expect(firstPromise).toBe(secondPromise);

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toBe(second);

    first.close();
  });

  it('returns a database with the expected schema', async () => {
    const service = new QuizLabDatabaseService();
    const db = await service.getDatabase();

    expect(db.objectStoreNames.contains('quizzes')).toBe(true);
    expect(db.objectStoreNames.contains('questions')).toBe(true);
    expect(db.objectStoreNames.contains('attempts')).toBe(true);

    db.close();
  });
});
