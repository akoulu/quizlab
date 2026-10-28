import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { QuizAttempt } from '../../domain/quiz.models';

import { QuizLabDatabaseService } from './quizlab-database.service';
import { IndexedDbAttemptRepository } from './indexed-db-attempt.repository';

function createRepository(): IndexedDbAttemptRepository {
  return new IndexedDbAttemptRepository(new QuizLabDatabaseService());
}

function createAttempt(id: string, quizId = 'quiz-attempt-test'): QuizAttempt {
  const now = Date.now();

  return {
    id,
    quizId,
    status: 'completed',
    questionIds: ['question-1'],
    answers: [
      {
        questionId: 'question-1',
        questionSnapshot: {
          id: 'question-1',
          text: 'Original question text',
          category: 'general',
          difficulty: 'easy',
          options: [
            { id: 'answer-a', text: 'Option A' },
            { id: 'answer-b', text: 'Option B' },
          ],
          correctAnswerId: 'answer-a',
          explanation: 'Original explanation',
        },
        selectedAnswerId: 'answer-a',
        isCorrect: true,
        answeredAt: now,
      },
    ],
    startedAt: now,
    finishedAt: now + 1000,
    result: {
      totalQuestions: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      score: 1,
      percentage: 100,
      durationSeconds: 1,
    },
  };
}

describe('IndexedDbAttemptRepository', () => {
  it('returns an empty list when no attempts exist', async () => {
    const repository = createRepository();

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it('returns null when an attempt does not exist', async () => {
    const repository = createRepository();

    await expect(repository.getById('missing')).resolves.toBeNull();
  });

  it('saves and retrieves an attempt with its question snapshot', async () => {
    const repository = createRepository();
    const attempt = createAttempt('attempt-save-test');

    await repository.save(attempt);

    await expect(repository.getById(attempt.id)).resolves.toEqual(attempt);
  });

  it('returns only attempts belonging to the requested quiz', async () => {
    const repository = createRepository();
    const first = createAttempt('attempt-quiz-filter-1', 'quiz-filter-a');
    const second = createAttempt('attempt-quiz-filter-2', 'quiz-filter-b');
    const third = createAttempt('attempt-quiz-filter-3', 'quiz-filter-a');

    await Promise.all([repository.save(first), repository.save(second), repository.save(third)]);

    const attempts = await repository.getByQuizId('quiz-filter-a');

    expect(attempts).toHaveLength(2);
    expect(attempts.map((attempt) => attempt.id).sort()).toEqual([
      'attempt-quiz-filter-1',
      'attempt-quiz-filter-3',
    ]);
  });

  it('updates an existing attempt with the same id', async () => {
    const repository = createRepository();
    const quizId = 'quiz-update-isolation';
    const original = createAttempt('attempt-update-isolation', quizId);

    await repository.save(original);

    const updated: QuizAttempt = {
      ...original,
      status: 'abandoned',
      finishedAt: null,
      result: null,
    };

    await repository.save(updated);

    await expect(repository.getById(updated.id)).resolves.toEqual(updated);

    const attempts = await repository.getByQuizId(quizId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toEqual(updated);
  });
});
