import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { Question } from '../../domain/quiz.models';

import { QuizLabDatabaseService } from './quizlab-database.service';
import { IndexedDbQuestionRepository } from './indexed-db-question.repository';

function createRepository(): IndexedDbQuestionRepository {
  return new IndexedDbQuestionRepository(new QuizLabDatabaseService());
}

function createQuestion(id: string, quizId = 'quiz-1'): Question {
  const now = Date.now();

  return {
    id,
    quizId,
    category: 'general',
    difficulty: 'easy',
    text: `Question ${id}`,
    options: [
      { id: `${id}-a`, text: 'Option A' },
      { id: `${id}-b`, text: 'Option B' },
    ],
    correctAnswerId: `${id}-a`,
    createdAt: now,
    updatedAt: now,
  };
}

describe('IndexedDbQuestionRepository', () => {
  it('returns null when a question does not exist', async () => {
    const repository = createRepository();

    await expect(repository.getById('missing')).resolves.toBeNull();
  });

  it('saves and retrieves a question', async () => {
    const repository = createRepository();
    const question = createQuestion('question-1');

    await repository.save(question);

    await expect(repository.getById(question.id)).resolves.toEqual(question);
  });

  it('returns only questions belonging to the requested quiz', async () => {
    const repository = createRepository();
    const first = createQuestion('question-1', 'quiz-1');
    const second = createQuestion('question-2', 'quiz-2');
    const third = createQuestion('question-3', 'quiz-1');

    await repository.saveMany([first, second, third]);

    const questions = await repository.getByQuizId('quiz-1');

    expect(questions).toHaveLength(2);
    expect(questions.map((question) => question.id).sort()).toEqual(['question-1', 'question-3']);
  });

  it('preserves the requested ID order', async () => {
    const repository = createRepository();
    const first = createQuestion('question-1');
    const second = createQuestion('question-2');
    const third = createQuestion('question-3');

    await repository.saveMany([first, second, third]);

    const questions = await repository.getByIds(['question-3', 'question-1', 'question-2']);

    expect(questions.map((question) => question.id)).toEqual([
      'question-3',
      'question-1',
      'question-2',
    ]);
  });

  it('skips IDs that do not exist', async () => {
    const repository = createRepository();
    const question = createQuestion('question-1');

    await repository.save(question);

    const questions = await repository.getByIds(['missing', 'question-1', 'also-missing']);

    expect(questions).toEqual([question]);
  });

  it('returns an empty array for an empty ID list', async () => {
    const repository = createRepository();

    await expect(repository.getByIds([])).resolves.toEqual([]);
  });

  it('saves multiple questions in one operation', async () => {
    const repository = createRepository();
    const quizId = 'quiz-batch-test';
    const questions = [
      createQuestion('batch-question-1', quizId),
      createQuestion('batch-question-2', quizId),
    ];

    await repository.saveMany(questions);

    const savedQuestions = await repository.getByQuizId(quizId);

    expect(savedQuestions).toHaveLength(2);
    expect(savedQuestions.map((question) => question.id)).toEqual([
      'batch-question-1',
      'batch-question-2',
    ]);
  });
  it('rolls back all writes when one question in saveMany fails', async () => {
    const repository = createRepository();

    const first = createQuestion('atomic-question-1', 'atomic-quiz');
    const invalid = {
      ...createQuestion('atomic-question-2', 'atomic-quiz'),
      id: undefined,
    } as unknown as Question;

    await expect(repository.saveMany([first, invalid])).rejects.toThrow();

    await expect(repository.getById(first.id)).resolves.toBeNull();
  });

  it('deletes only the question with the requested ID', async () => {
    const repository = createRepository();
    const first = createQuestion('question-1');
    const second = createQuestion('question-2');

    await repository.saveMany([first, second]);
    await repository.delete(first.id);

    await expect(repository.getById(first.id)).resolves.toBeNull();
    await expect(repository.getById(second.id)).resolves.toEqual(second);
  });
});
