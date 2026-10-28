import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import type { Quiz } from '../../domain/quiz.models';

import { QuizLabDatabaseService } from './quizlab-database.service';
import { IndexedDbQuizRepository } from './indexed-db-quiz.repository';

const openConnections: IDBDatabase[] = [];

function createRepository(): IndexedDbQuizRepository {
  return new IndexedDbQuizRepository(new QuizLabDatabaseService());
}

function createQuiz(overrides: Partial<Quiz> = {}): Quiz {
  const now = Date.now();

  return {
    id: 'quiz-test-1',
    title: 'Test quiz',
    description: 'Quiz used by repository tests',
    source: 'user',
    status: 'draft',
    questionIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

afterEach(() => {
  for (const db of openConnections.splice(0)) {
    db.close();
  }
});

describe('IndexedDbQuizRepository', () => {
  it('returns an empty list when no quizzes exist', async () => {
    const repository = createRepository();

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it('returns null when a quiz does not exist', async () => {
    const repository = createRepository();

    await expect(repository.getById('missing')).resolves.toBeNull();
  });

  it('saves and retrieves a quiz', async () => {
    const repository = createRepository();
    const quiz = createQuiz();

    await repository.save(quiz);

    await expect(repository.getById(quiz.id)).resolves.toEqual(quiz);
    await expect(repository.getAll()).resolves.toEqual([quiz]);
  });

  it('updates an existing quiz with the same id', async () => {
    const repository = createRepository();
    const original = createQuiz();

    await repository.save(original);

    const updated = createQuiz({
      title: 'Updated title',
      updatedAt: original.updatedAt + 1,
    });

    await repository.save(updated);

    await expect(repository.getAll()).resolves.toEqual([updated]);
    await expect(repository.getById(updated.id)).resolves.toEqual(updated);
  });
});
