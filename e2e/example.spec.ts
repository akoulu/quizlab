import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('логотип повертає користувача до налаштувань', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await expect(page.getByRole('heading', { name: /Час перевірити знання/ })).toBeVisible();

  await page.getByRole('button', { name: /QuizLab/ }).click();

  await expect(page.getByRole('heading', { name: 'Створи свою вікторину' })).toBeVisible();
});

test('користувач може завершити вікторину достроково', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await expect(page.getByRole('heading', { name: /Час перевірити знання/ })).toBeVisible();

  await page.getByRole('button', { name: 'Завершити' }).click();

  await expect(page.getByRole('heading', { name: 'Створи свою вікторину' })).toBeVisible();

  await expect(page.getByRole('button', { name: /Почати вікторину/ })).toBeEnabled();
});
