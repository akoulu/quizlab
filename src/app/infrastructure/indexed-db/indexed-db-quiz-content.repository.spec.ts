import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { Question, Quiz } from '../../domain/quiz.models';

import { IndexedDbQuestionRepository } from './indexed-db-question.repository';
import { IndexedDbQuizContentRepository } from './indexed-db-quiz-content.repository';
import { IndexedDbQuizRepository } from './indexed-db-quiz.repository';
import { QuizLabDatabaseService } from './quizlab-database.service';
import { QuizLabTransactionService } from './quizlab-transaction.service';

function createContentRepository(): IndexedDbQuizContentRepository {
  return new IndexedDbQuizContentRepository(
    new QuizLabTransactionService(new QuizLabDatabaseService()),
  );
}

function createQuestion(id: string, quizId: string): Question {
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

function createQuiz(id: string, questionIds: readonly string[]): Quiz {
  const now = Date.now();

  return {
    id,
    title: 'Atomic save test',
    description: 'Quiz used by repository tests',
    source: 'user',
    status: 'draft',
    questionIds,
    createdAt: now,
    updatedAt: now,
  };
}

describe('IndexedDbQuizContentRepository', () => {
  it('saves the question and updated quiz in one operation', async () => {
    const contentRepository = createContentRepository();
    const questionRepository = new IndexedDbQuestionRepository(new QuizLabDatabaseService());
    const quizRepository = new IndexedDbQuizRepository(new QuizLabDatabaseService());
    const quizId = `quiz-${crypto.randomUUID()}`;
    const question = createQuestion(`question-${crypto.randomUUID()}`, quizId);
    const quiz = createQuiz(quizId, [question.id]);

    await contentRepository.saveQuestionAndQuiz(question, quiz);

    await expect(questionRepository.getById(question.id)).resolves.toEqual(question);
    await expect(quizRepository.getById(quiz.id)).resolves.toEqual(quiz);
  });

  it('rolls back the question when saving the quiz fails', async () => {
    const contentRepository = createContentRepository();
    const questionRepository = new IndexedDbQuestionRepository(new QuizLabDatabaseService());
    const questionId = `question-${crypto.randomUUID()}`;
    const question = createQuestion(questionId, undefined as unknown as string);
    const invalidQuiz = createQuiz(undefined as unknown as string, [questionId]);

    await expect(contentRepository.saveQuestionAndQuiz(question, invalidQuiz)).rejects.toThrow();

    await expect(questionRepository.getById(questionId)).resolves.toBeNull();
  });

  it('rejects when the question and quiz IDs do not match', async () => {
    const contentRepository = createContentRepository();
    const question = createQuestion(
      `question-${crypto.randomUUID()}`,
      `quiz-${crypto.randomUUID()}`,
    );
    const quiz = createQuiz(`quiz-${crypto.randomUUID()}`, [question.id]);

    await expect(contentRepository.saveQuestionAndQuiz(question, quiz)).rejects.toThrow(
      'Question and quiz IDs do not match.',
    );
  });

  it('rejects when the quiz does not reference the question being saved', async () => {
    const contentRepository = createContentRepository();
    const quizId = `quiz-${crypto.randomUUID()}`;
    const question = createQuestion(`question-${crypto.randomUUID()}`, quizId);
    const quiz = createQuiz(quizId, []);

    await expect(contentRepository.saveQuestionAndQuiz(question, quiz)).rejects.toThrow(
      'Quiz must reference the question being saved.',
    );
  });
});
