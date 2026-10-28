import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Quiz } from '../domain/quiz.models';
import type { QuizRepository } from '../domain/quiz.repository';
import type { QuizContentRepository } from '../domain/quiz-content.repository';
import type { Question } from '../domain/quiz.models';
import { QuizApplicationService } from './quiz-application.service';

function createQuiz(overrides: Partial<Quiz> = {}): Quiz {
  const now = 1_700_000_000_000;

  return {
    id: 'quiz-test-1',
    title: 'Test quiz',
    description: 'Test description',
    source: 'user',
    status: 'draft',
    questionIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createQuestion(overrides: Partial<Question> = {}): Question {
  const now = 1_700_000_000_000;

  return {
    id: 'question-1',
    quizId: 'quiz-test-1',
    category: 'general',
    difficulty: 'easy',
    text: 'What is 2 + 2?',
    options: [
      { id: 'answer-1', text: '4' },
      { id: 'answer-2', text: '5' },
    ],
    correctAnswerId: 'answer-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createQuestionRepositoryMock() {
  return {
    getById: vi.fn().mockResolvedValue(null),
    getByQuizId: vi.fn<() => Promise<readonly Question[]>>().mockResolvedValue([]),
    getByIds: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    saveMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createQuizContentRepositoryMock() {
  return {
    saveQuestionAndQuiz: vi
      .fn<QuizContentRepository['saveQuestionAndQuiz']>()
      .mockResolvedValue(undefined),
  };
}
function createRepositoryMock() {
  return {
    getAll: vi.fn<() => Promise<readonly Quiz[]>>().mockResolvedValue([]),
    getById: vi.fn<(id: string) => Promise<Quiz | null>>().mockResolvedValue(null),
    save: vi.fn<(quiz: Quiz) => Promise<void>>().mockResolvedValue(undefined),
    delete: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  };
}

describe('QuizApplicationService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all quizzes from the repository', async () => {
    const repository = createRepositoryMock();
    const quizzes = [createQuiz()];
    repository.getAll.mockResolvedValue(quizzes);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.getAll()).resolves.toEqual(quizzes);
    expect(repository.getAll).toHaveBeenCalledOnce();
  });

  it('returns a quiz by id', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz();
    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.getById(quiz.id)).resolves.toEqual(quiz);
    expect(repository.getById).toHaveBeenCalledWith(quiz.id);
  });

  it('creates a user draft with normalized fields and timestamps', async () => {
    const repository = createRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );
    const now = 1_800_000_000_000;

    vi.spyOn(Date, 'now').mockReturnValue(now);

    const quiz = await service.create({
      title: '  My quiz  ',
      description: '  A useful description  ',
    });

    expect(quiz.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(quiz.title).toBe('My quiz');
    expect(quiz.description).toBe('A useful description');
    expect(quiz.source).toBe('user');
    expect(quiz.status).toBe('draft');
    expect(quiz.questionIds).toEqual([]);
    expect(quiz.createdAt).toBe(now);
    expect(quiz.updatedAt).toBe(now);
    expect(repository.save).toHaveBeenCalledWith(quiz);
  });

  it('uses an empty description when none is supplied', async () => {
    const repository = createRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    const quiz = await service.create({ title: 'My quiz' });

    expect(quiz.description).toBe('');
  });

  it('rejects an empty title', async () => {
    const repository = createRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.create({ title: '   ' })).rejects.toThrow('Quiz title is required.');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a title longer than 120 characters', async () => {
    const repository = createRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.create({ title: 'a'.repeat(121) })).rejects.toThrow(
      'Quiz title must not exceed 120 characters.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a description longer than 2000 characters', async () => {
    const repository = createRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(
      service.create({
        title: 'My quiz',
        description: 'a'.repeat(2001),
      }),
    ).rejects.toThrow('Quiz description must not exceed 2000 characters.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates the title and description of a draft quiz', async () => {
    const repository = createRepositoryMock();
    const original = createQuiz();
    repository.getById.mockResolvedValue(original);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    const updated = await service.update(original.id, {
      title: '  Updated quiz  ',
      description: '  Updated description  ',
    });

    expect(updated.title).toBe('Updated quiz');
    expect(updated.description).toBe('Updated description');
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
    expect(repository.save).toHaveBeenCalledWith(updated);
  });

  it('rejects editing a built-in quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ source: 'builtin' });
    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.update(quiz.id, { title: 'Changed' })).rejects.toThrow(
      'Built-in quizzes cannot be edited.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects editing a published quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ status: 'published' });
    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.update(quiz.id, { title: 'Changed' })).rejects.toThrow(
      'Only draft quizzes can be edited.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('sets the question order of a draft quiz', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz({ questionIds: ['question-1', 'question-2'] });
    const first = createQuestion({ id: 'question-1' });
    const second = createQuestion({ id: 'question-2' });

    repository.getById.mockResolvedValue(quiz);
    questionRepository.getByIds.mockResolvedValue([second, first]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    const updated = await service.setQuestionOrder(quiz.id, ['question-2', 'question-1']);

    expect(updated.questionIds).toEqual(['question-2', 'question-1']);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(quiz.updatedAt);
    expect(questionRepository.getByIds).toHaveBeenCalledWith(['question-2', 'question-1']);
    expect(repository.save).toHaveBeenCalledWith(updated);
  });

  it('rejects an empty question order', async () => {
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz());

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', [])).rejects.toThrow(
      'Question IDs must be non-empty, unique, and contain at least one question.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects blank question IDs in the order', async () => {
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz());

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', ['question-1', '   '])).rejects.toThrow(
      'Question IDs must be non-empty, unique, and contain at least one question.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate question IDs in the order', async () => {
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz());

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(
      service.setQuestionOrder('quiz-test-1', ['question-1', 'question-1']),
    ).rejects.toThrow('Question IDs must be non-empty, unique, and contain at least one question.');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an order containing a missing question', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz());
    questionRepository.getByIds.mockResolvedValue([]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', ['missing-question'])).rejects.toThrow(
      'One or more quiz questions could not be found.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a question belonging to another quiz when setting order', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz());
    questionRepository.getByIds.mockResolvedValue([createQuestion({ quizId: 'another-quiz-id' })]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', ['question-1'])).rejects.toThrow(
      'A question belongs to a different quiz.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects changing the order of a built-in quiz', async () => {
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz({ source: 'builtin' }));

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', ['question-1'])).rejects.toThrow(
      'Built-in quizzes cannot be edited.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects changing the order of a published quiz', async () => {
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(createQuiz({ status: 'published' }));

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.setQuestionOrder('quiz-test-1', ['question-1'])).rejects.toThrow(
      'Only draft quizzes can be edited.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('publishes a valid draft and records its question IDs', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const question = createQuestion();

    repository.getById.mockResolvedValue(quiz);
    questionRepository.getByIds.mockResolvedValue([question]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    const published = await service.publish(quiz.id);

    expect(published.status).toBe('published');
    expect(published.questionIds).toEqual(['question-1']);
    expect(repository.save).toHaveBeenCalledWith(published);
    expect(questionRepository.getByIds).toHaveBeenCalledWith(['question-1']);
  });

  it('rejects publishing a quiz with no questions', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz();

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'A quiz must contain at least one question to be published.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question with blank text', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz({ questionIds: ['question-1'] });

    repository.getById.mockResolvedValue(quiz);
    questionRepository.getByIds.mockResolvedValue([createQuestion({ text: '   ' })]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow('Question text is required.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question with fewer than two options', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz({ questionIds: ['question-1'] });

    repository.getById.mockResolvedValue(quiz);
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({
        options: [{ id: 'answer-1', text: '4' }],
      }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'Each question must have at least two answer options.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question whose correct answer does not exist', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quiz = createQuiz({ questionIds: ['question-1'] });

    repository.getById.mockResolvedValue(quiz);
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({ correctAnswerId: 'missing-answer' }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'The correct answer must reference an existing option.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question with a blank ID', async () => {
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([createQuestion({ id: '   ', quizId: quiz.id })]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'Question IDs must be non-empty and unique.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing questions with duplicate IDs', async () => {
    const quiz = createQuiz({ questionIds: ['requested-1', 'requested-2'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({ id: 'duplicate-id', quizId: quiz.id }),
      createQuestion({ id: 'duplicate-id', quizId: quiz.id }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'Question IDs must be non-empty and unique.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question with a blank answer option ID', async () => {
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({
        quizId: quiz.id,
        options: [
          { id: '   ', text: '4' },
          { id: 'answer-2', text: '5' },
        ],
      }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'Answer option IDs must be non-empty and unique.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing questions with duplicate answer option IDs', async () => {
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({
        quizId: quiz.id,
        options: [
          { id: 'duplicate-id', text: '4' },
          { id: 'duplicate-id', text: '5' },
        ],
      }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'Answer option IDs must be non-empty and unique.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question with a blank answer option text', async () => {
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([
      createQuestion({
        quizId: quiz.id,
        options: [
          { id: 'answer-1', text: '   ' },
          { id: 'answer-2', text: '5' },
        ],
      }),
    ]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow('Answer option text is required.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a question that belongs to another quiz', async () => {
    const quiz = createQuiz({ questionIds: ['question-1'] });
    const repository = createRepositoryMock();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    questionRepository.getByIds.mockResolvedValue([createQuestion({ quizId: 'another-quiz-id' })]);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow(
      'A question belongs to a different quiz.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a built-in quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ source: 'builtin' });

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow('Built-in quizzes cannot be published.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing an already published quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ status: 'published' });

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.publish(quiz.id)).rejects.toThrow('Only draft quizzes can be published.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('archives a user quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz();

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    const archived = await service.archive(quiz.id);

    expect(archived.status).toBe('archived');
    expect(archived.id).toBe(quiz.id);
    expect(repository.save).toHaveBeenCalledWith(archived);
  });

  it('rejects archiving a built-in quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ source: 'builtin' });

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.archive(quiz.id)).rejects.toThrow('Built-in quizzes cannot be archived.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects archiving an already archived quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ status: 'archived' });

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.archive(quiz.id)).rejects.toThrow('Quiz is already archived.');

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects editing a quiz that does not exist', async () => {
    const repository = createRepositoryMock();

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      createQuestionRepositoryMock(),
      createQuizContentRepositoryMock(),
    );

    await expect(service.update('missing', { title: 'Changed' })).rejects.toThrow(
      'Quiz "missing" was not found.',
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('adds a question to a draft quiz and appends its ID to the quiz order', async () => {
    const repository = createRepositoryMock();
    const questionRepository = createQuestionRepositoryMock();
    const quizContentRepository = createQuizContentRepositoryMock();
    const quiz = createQuiz();

    repository.getById.mockResolvedValue(quiz);

    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      quizContentRepository,
    );

    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);

    const question = await service.addQuestion(quiz.id, {
      category: 'science',
      difficulty: 'easy',
      text: '  What is 2 + 2?  ',
      options: [
        { id: 'answer-1', text: ' 4 ' },
        { id: 'answer-2', text: ' 5 ' },
      ],
      correctAnswerId: 'answer-1',
      explanation: '  Basic arithmetic.  ',
    });

    expect(question.text).toBe('What is 2 + 2?');
    expect(question.options).toEqual([
      { id: 'answer-1', text: '4' },
      { id: 'answer-2', text: '5' },
    ]);
    expect(question.explanation).toBe('Basic arithmetic.');
    expect(question.quizId).toBe(quiz.id);
    expect(questionRepository.save).not.toHaveBeenCalled();

    expect(repository.save).not.toHaveBeenCalled();
    expect(quizContentRepository.saveQuestionAndQuiz).toHaveBeenCalledWith(
      question,
      expect.objectContaining({
        id: quiz.id,
        questionIds: [question.id],
        updatedAt: 1_800_000_000_000,
      }),
    );
  });

  it('rejects adding a question to a published quiz', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz({ status: 'published' });
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(
      service.addQuestion(quiz.id, {
        category: 'science',
        difficulty: 'easy',
        text: 'Question?',
        options: [
          { id: 'answer-1', text: 'A' },
          { id: 'answer-2', text: 'B' },
        ],
        correctAnswerId: 'answer-1',
      }),
    ).rejects.toThrow('Only draft quizzes can be edited.');

    expect(questionRepository.save).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects adding a question with blank text', async () => {
    const repository = createRepositoryMock();
    const quiz = createQuiz();
    repository.getById.mockResolvedValue(quiz);

    const questionRepository = createQuestionRepositoryMock();
    const service = new QuizApplicationService(
      repository as unknown as QuizRepository,
      questionRepository,
      createQuizContentRepositoryMock(),
    );

    await expect(
      service.addQuestion(quiz.id, {
        category: 'science',
        difficulty: 'easy',
        text: '   ',
        options: [
          { id: 'answer-1', text: 'A' },
          { id: 'answer-2', text: 'B' },
        ],
        correctAnswerId: 'answer-1',
      }),
    ).rejects.toThrow('Question text is required.');

    expect(questionRepository.save).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
