import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('початковий екран не має порушень автоматичного аудиту доступності', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('екран вікторини не має порушень автоматичного аудиту доступності', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await expect(page.locator('h2[tabindex="-1"]')).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('екран результатів не має порушень автоматичного аудиту доступності', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  // Проходимо вікторину, обираючи перший варіант у кожному запитанні.
  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Наступне запитання/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Побачити результат/ }).click();

  await expect(page.getByRole('heading', { name: 'Чудова робота!' })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
