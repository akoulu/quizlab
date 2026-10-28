import { expect, test, type Page } from '@playwright/test';

const publishedQuiz = {
  id: 'custom-published',
  title: 'Тестова вікторина',
  description: 'Перевірка користувацького каталогу',
  source: 'user',
  status: 'published',
  questionIds: ['custom-question-1'],
  createdAt: 1000,
  updatedAt: 1000,
};

const question = {
  id: 'custom-question-1',
  quizId: 'custom-published',
  category: 'science',
  difficulty: 'easy',
  text: 'Яка планета найбільша в Сонячній системі?',
  options: [
    { id: 'earth', text: 'Земля' },
    { id: 'jupiter', text: 'Юпітер' },
  ],
  correctAnswerId: 'jupiter',
  explanation: 'Юпітер — найбільша планета Сонячної системи.',
  createdAt: 1000,
  updatedAt: 1000,
};

async function seedRecords(
  page: Page,
  records: {
    quizzes?: (typeof publishedQuiz)[];
    questions?: (typeof question)[];
  },
): Promise<void> {
  await page.evaluate(
    async ({ quizzes, questions }) => {
      const request = indexedDB.open('quizlab', 1);

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('IndexedDB open blocked'));
      });

      try {
        const transaction = db.transaction(['quizzes', 'questions'], 'readwrite');

        for (const quiz of quizzes) {
          transaction.objectStore('quizzes').put(quiz);
        }

        for (const item of questions) {
          transaction.objectStore('questions').put(item);
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    },
    {
      quizzes: records.quizzes ?? [],
      questions: records.questions ?? [],
    },
  );
}

test.describe('Користувацькі вікторини', () => {
  test('показує порожній каталог, якщо опублікованих вікторин немає', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Користувацькі вікторини' })).toBeVisible();

    await expect(
      page.getByText(
        'Опублікованих користувацьких вікторин поки немає. Чернетки не відображаються в каталозі.',
      ),
    ).toBeVisible();
  });

  test('показує опубліковані користувацькі вікторини, але приховує чернетки та вбудовані', async ({
    page,
  }) => {
    await page.goto('/');

    await seedRecords(page, {
      quizzes: [
        publishedQuiz,
        {
          ...publishedQuiz,
          id: 'custom-draft',
          title: 'Чернетка — не показувати',
          status: 'draft',
          questionIds: [],
        },
        {
          ...publishedQuiz,
          id: 'builtin-quiz',
          title: 'Вбудована — не показувати',
          source: 'builtin',
        },
      ],
      questions: [question],
    });

    await page.getByRole('button', { name: 'Оновити список' }).click();

    const catalog = page.getByRole('region', {
      name: 'Користувацькі вікторини',
    });

    await expect(catalog.getByRole('heading', { name: 'Тестова вікторина' })).toBeVisible();

    await expect(catalog.getByText('Чернетка — не показувати')).toHaveCount(0);

    await expect(catalog.getByText('Вбудована — не показувати')).toHaveCount(0);
  });

  test('запускає вибрану вікторину та показує її запитання', async ({ page }) => {
    await page.goto('/');

    await seedRecords(page, {
      quizzes: [publishedQuiz],
      questions: [question],
    });

    await page.getByRole('button', { name: 'Оновити список' }).click();

    await page.getByRole('button', { name: 'Почати цю вікторину' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Яка планета найбільша в Сонячній системі?',
      }),
    ).toBeVisible();

    await expect(page.getByRole('button', { name: /Земля/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Юпітер/ })).toBeVisible();
    await expect(page.getByText('Запитання 1 із 1')).toBeVisible();
  });

  test('показує помилку, якщо в опублікованої вікторини відсутнє запитання', async ({ page }) => {
    await page.goto('/');

    await seedRecords(page, {
      quizzes: [
        {
          ...publishedQuiz,
          id: 'quiz-with-missing-question',
          title: 'Вікторина з відсутнім запитанням',
          questionIds: ['question-that-does-not-exist'],
        },
      ],
    });

    await page.getByRole('button', { name: 'Оновити список' }).click();

    await page.getByRole('button', { name: 'Почати цю вікторину' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'One or more quiz questions could not be found.',
    );
  });
});
