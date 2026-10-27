import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('початковий екран відображається коректно', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Перевір свої знання/ })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Створи свою вікторину' })).toBeVisible();

  await expect(page.getByRole('button', { name: /Почати вікторину/ })).toBeEnabled();

  // HTML-теги не повинні відображатися як звичайний текст.
  await expect(page.locator('body')).not.toContainText(/<h[1-6]\b|<\/h[1-6]>|&lt;h[1-6]/i);
});

test('користувач проходить вікторину та перезапускає її', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  const questionHeading = page.locator('h2[tabindex="-1"]');

  await expect(questionHeading).toBeVisible();
  await expect(questionHeading).toBeFocused();
  await expect(page.getByText(/Запитання 1 із 2/)).toBeVisible();

  // Вибираємо перший варіант відповіді.
  await page.locator('button[aria-pressed]').first().click();

  await expect(page.getByRole('status')).toBeVisible();

  await page.getByRole('button', { name: /Наступне запитання/ }).click();

  await expect(page.getByText(/Запитання 2 із 2/)).toBeVisible();
  await expect(questionHeading).toBeFocused();

  await page.locator('button[aria-pressed]').first().click();

  await page.getByRole('button', { name: /Побачити результат/ }).click();

  await expect(page.getByRole('heading', { name: 'Чудова робота!' })).toBeVisible();

  await expect(page.getByText('Твій результат')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Чудова робота!' })).toBeFocused();

  await page.getByRole('button', { name: /Спробувати ще раз/ }).click();

  await expect(page.getByRole('heading', { name: 'Створи свою вікторину' })).toBeVisible();
});

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`адаптивність: ширина вікна ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Перевір свої знання/ })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));

    expect(
      dimensions.documentWidth,
      `Горизонтальне переповнення при ширині ${width}px`,
    ).toBeLessThanOrEqual(dimensions.viewportWidth);
  });
}

for (const width of [320, 375, 768]) {
  test(`адаптивність вікторини та результатів: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');

    const expectNoHorizontalOverflow = async () => {
      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.documentWidth,
        `Горизонтальне переповнення при ширині ${width}px`,
      ).toBeLessThanOrEqual(dimensions.viewportWidth);
    };

    await expectNoHorizontalOverflow();

    await page.getByRole('button', { name: /Почати вікторину/ }).click();
    await expect(page.locator('h2[tabindex="-1"]')).toBeVisible();
    await expectNoHorizontalOverflow();

    await page.locator('button[aria-pressed]').first().click();
    await page.getByRole('button', { name: /Наступне запитання/ }).click();

    await page.locator('button[aria-pressed]').first().click();
    await page.getByRole('button', { name: /Побачити результат/ }).click();

    await expect(page.getByRole('heading', { name: 'Чудова робота!' })).toBeVisible();

    await expectNoHorizontalOverflow();
  });
}
