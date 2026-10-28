import { Inject, Injectable } from '@angular/core';

import type { Question, Quiz } from '../domain/quiz.models';
import type { QuizContentRepository } from '../domain/quiz-content.repository';
import type { QuestionRepository } from '../domain/question.repository';
import type { QuizRepository } from '../domain/quiz.repository';
import type { QuizId } from '../domain/quiz.types';
import { QUESTION_REPOSITORY, QUIZ_CONTENT_REPOSITORY, QUIZ_REPOSITORY } from './repository.tokens';

export interface CreateQuizInput {
  readonly title: string;
  readonly description?: string;
}

export interface UpdateQuizInput {
  readonly title: string;
  readonly description?: string;
}
export interface CreateQuestionInput {
  readonly category: Question['category'];
  readonly difficulty: Question['difficulty'];
  readonly text: string;
  readonly options: Question['options'];
  readonly correctAnswerId: Question['correctAnswerId'];
  readonly explanation?: string;
}

export type UpdateQuestionInput = CreateQuestionInput;

@Injectable({ providedIn: 'root' })
export class QuizApplicationService {
  constructor(
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(QUIZ_CONTENT_REPOSITORY)
    private readonly quizContentRepository: QuizContentRepository,
  ) {}

  async getAll(): Promise<readonly Quiz[]> {
    return this.quizRepository.getAll();
  }

  async getById(id: QuizId): Promise<Quiz | null> {
    return this.quizRepository.getById(id);
  }

  async getQuestions(id: QuizId): Promise<readonly Question[]> {
    const quiz = await this.requireQuiz(id);

    if (quiz.source !== 'user') {
      throw new Error('Built-in quizzes cannot be edited.');
    }

    if (quiz.status !== 'draft') {
      throw new Error('Only draft quizzes can be edited.');
    }

    const questions = await this.questionRepository.getByIds(quiz.questionIds);

    if (questions.length !== quiz.questionIds.length) {
      throw new Error('One or more quiz questions could not be found.');
    }

    const questionsById = new Map(questions.map((question) => [question.id, question]));

    return quiz.questionIds.map((questionId) => {
      const question = questionsById.get(questionId);

      if (!question) {
        throw new Error(`Quiz question "${questionId}" could not be found.`);
      }

      if (question.quizId !== quiz.id) {
        throw new Error('A question belongs to a different quiz.');
      }

      return question;
    });
  }

  async addQuestion(id: QuizId, input: CreateQuestionInput): Promise<Question> {
    const quiz = await this.requireQuiz(id);

    if (quiz.source !== 'user') {
      throw new Error('Built-in quizzes cannot be edited.');
    }

    if (quiz.status !== 'draft') {
      throw new Error('Only draft quizzes can be edited.');
    }

    this.validateQuestionInput(input);

    const now = Date.now();
    const question: Question = {
      id: this.createId(),
      quizId: quiz.id,
      category: input.category,
      difficulty: input.difficulty,
      text: input.text.trim(),
      options: input.options.map((option) => ({
        id: option.id,
        text: option.text.trim(),
      })),
      correctAnswerId: input.correctAnswerId,
      ...(input.explanation?.trim() ? { explanation: input.explanation.trim() } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const updatedQuiz: Quiz = {
      ...quiz,
      questionIds: [...quiz.questionIds, question.id],
      updatedAt: now,
    };

    await this.quizContentRepository.saveQuestionAndQuiz(question, updatedQuiz);

    return question;
  }
  async getPublishedQuestions(id: QuizId): Promise<readonly Question[]> {
    const quiz = await this.requireQuiz(id);

    if (quiz.status !== 'published') {
      throw new Error('Only published quizzes can be started.');
    }

    if (quiz.questionIds.length === 0) {
      throw new Error('A published quiz must contain at least one question.');
    }

    const storedQuestions = await this.questionRepository.getByIds(quiz.questionIds);

    if (storedQuestions.length !== quiz.questionIds.length) {
      throw new Error('One or more quiz questions could not be found.');
    }

    const questionsById = new Map(storedQuestions.map((question) => [question.id, question]));

    return quiz.questionIds.map((questionId) => {
      const question = questionsById.get(questionId);

      if (!question) {
        throw new Error(`Quiz question "${questionId}" could not be found.`);
      }

      if (question.quizId !== quiz.id) {
        throw new Error('A question belongs to a different quiz.');
      }

      return question;
    });
  }

  async create(input: CreateQuizInput): Promise<Quiz> {
    const title = this.normalizeTitle(input.title);
    const description = this.normalizeDescription(input.description);
    const now = Date.now();

    const quiz: Quiz = {
      id: this.createId(),
      title,
      description,
      source: 'user',
      status: 'draft',
      questionIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }

  async update(id: QuizId, input: UpdateQuizInput): Promise<Quiz> {
    const existing = await this.requireQuiz(id);

    if (existing.source !== 'user') {
      throw new Error('Built-in quizzes cannot be edited.');
    }

    if (existing.status !== 'draft') {
      throw new Error('Only draft quizzes can be edited.');
    }

    const updated: Quiz = {
      ...existing,
      title: this.normalizeTitle(input.title),
      description: this.normalizeDescription(input.description),
      updatedAt: Date.now(),
    };

    await this.quizRepository.save(updated);
    return updated;
  }

  async setQuestionOrder(id: QuizId, questionIds: readonly string[]): Promise<Quiz> {
    const existing = await this.requireQuiz(id);

    if (existing.source !== 'user') {
      throw new Error('Built-in quizzes cannot be edited.');
    }

    if (existing.status !== 'draft') {
      throw new Error('Only draft quizzes can be edited.');
    }

    if (
      questionIds.length === 0 ||
      questionIds.some((questionId) => !questionId.trim()) ||
      new Set(questionIds).size !== questionIds.length
    ) {
      throw new Error('Question IDs must be non-empty, unique, and contain at least one question.');
    }

    const questions = await this.questionRepository.getByIds(questionIds);

    if (questions.length !== questionIds.length) {
      throw new Error('One or more quiz questions could not be found.');
    }

    for (const question of questions) {
      if (question.quizId !== existing.id) {
        throw new Error('A question belongs to a different quiz.');
      }
    }

    const updated: Quiz = {
      ...existing,
      questionIds: [...questionIds],
      updatedAt: Date.now(),
    };

    await this.quizRepository.save(updated);
    return updated;
  }
  async publish(id: QuizId): Promise<Quiz> {
    const existing = await this.requireQuiz(id);

    if (existing.source !== 'user') {
      throw new Error('Built-in quizzes cannot be published.');
    }

    if (existing.status !== 'draft') {
      throw new Error('Only draft quizzes can be published.');
    }

    if (existing.questionIds.length === 0) {
      throw new Error('A quiz must contain at least one question to be published.');
    }

    const questions = await this.questionRepository.getByIds(existing.questionIds);

    if (questions.length !== existing.questionIds.length) {
      throw new Error('One or more quiz questions could not be found.');
    }

    this.validateQuestions(existing, questions);

    const updated: Quiz = {
      ...existing,
      status: 'published',
      updatedAt: Date.now(),
    };

    await this.quizRepository.save(updated);
    return updated;
  }

  async archive(id: QuizId): Promise<Quiz> {
    const existing = await this.requireQuiz(id);

    if (existing.source !== 'user') {
      throw new Error('Built-in quizzes cannot be archived.');
    }

    if (existing.status === 'archived') {
      throw new Error('Quiz is already archived.');
    }

    const updated: Quiz = {
      ...existing,
      status: 'archived',
      updatedAt: Date.now(),
    };

    await this.quizRepository.save(updated);
    return updated;
  }

  private validateQuestionInput(input: CreateQuestionInput): void {
    if (!input.text.trim()) {
      throw new Error('Question text is required.');
    }

    if (input.options.length < 2) {
      throw new Error('Each question must have at least two answer options.');
    }

    const answerIds = new Set<string>();

    for (const option of input.options) {
      if (!option.id.trim() || answerIds.has(option.id)) {
        throw new Error('Answer option IDs must be non-empty and unique.');
      }

      answerIds.add(option.id);

      if (!option.text.trim()) {
        throw new Error('Answer option text is required.');
      }
    }

    if (!answerIds.has(input.correctAnswerId)) {
      throw new Error('The correct answer must reference an existing option.');
    }
  }
  private validateQuestions(quiz: Quiz, questions: readonly Question[]): void {
    if (questions.length === 0) {
      throw new Error('A quiz must contain at least one question to be published.');
    }

    const questionIds = new Set<string>();

    for (const question of questions) {
      if (question.quizId !== quiz.id) {
        throw new Error('A question belongs to a different quiz.');
      }

      if (!question.id.trim() || questionIds.has(question.id)) {
        throw new Error('Question IDs must be non-empty and unique.');
      }

      questionIds.add(question.id);

      if (!question.text.trim()) {
        throw new Error('Question text is required.');
      }

      if (question.options.length < 2) {
        throw new Error('Each question must have at least two answer options.');
      }

      const answerIds = new Set<string>();

      for (const option of question.options) {
        if (!option.id.trim() || answerIds.has(option.id)) {
          throw new Error('Answer option IDs must be non-empty and unique.');
        }

        answerIds.add(option.id);

        if (!option.text.trim()) {
          throw new Error('Answer option text is required.');
        }
      }

      if (!answerIds.has(question.correctAnswerId)) {
        throw new Error('The correct answer must reference an existing option.');
      }
    }
  }

  private async requireQuiz(id: QuizId): Promise<Quiz> {
    const quiz = await this.quizRepository.getById(id);

    if (!quiz) {
      throw new Error(`Quiz "${id}" was not found.`);
    }

    return quiz;
  }

  private normalizeTitle(value: string): string {
    const title = value.trim();

    if (!title) {
      throw new Error('Quiz title is required.');
    }

    if (title.length > 120) {
      throw new Error('Quiz title must not exceed 120 characters.');
    }

    return title;
  }

  private normalizeDescription(value: string | undefined): string {
    const description = value?.trim() ?? '';

    if (description.length > 2000) {
      throw new Error('Quiz description must not exceed 2000 characters.');
    }

    return description;
  }

  private createId(): QuizId {
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
      throw new Error('Secure UUID generation is unavailable.');
    }

    return crypto.randomUUID();
  }
}
