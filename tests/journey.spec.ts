import { expect, test, type Page } from '@playwright/test';

async function choose(page: Page, experience = false) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Подобрать книгу', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: /^Вечер/ }).check();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.getByRole('checkbox', { name: /^Отвлечься/ }).check();
  await page.getByRole('checkbox', { name: /^Вдохновиться/ }).check();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  if (experience) {
    await page.getByLabel('Название книги или имя автора').fill('достоевскии');
    await page.getByRole('button', { name: /Белые ночи Фёдор/ }).click();
    await page.getByRole('button', { name: 'Показать книги', exact: true }).click();
  } else await page.getByRole('button', { name: /^Пропустить:/ }).click();
  await expect(page.getByRole('heading', { name: 'Подбираем книги…' })).toBeVisible();
  await expect(page.locator('.book-card')).toHaveCount(3, { timeout: 7000 });
}

test('reader, booking, feedback and next selection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await choose(page, true);
  await page.getByRole('link', { name: 'Не то настроение', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Вдохновиться/ })).toBeChecked();
  await page.getByRole('button', { name: 'Обновить подборку' }).click();
  await expect(page.locator('.book-card')).toHaveCount(3, { timeout: 7000 });
  await page.getByRole('link', { name: 'Читать отрывок', exact: true }).first().click();
  await page.getByRole('button', { name: 'Увеличить шрифт' }).click();
  await page.getByRole('button', { name: 'Тёмная тема' }).click();
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.reload();
  await expect(page.locator('.reader-dark')).toBeVisible();
  await expect(page.locator('.reader-page-controls')).toContainText('Страница 2');
  await expect(page.locator('.reader-paper')).toHaveCSS('font-size', '20px');
  while (await page.getByRole('button', { name: 'Дальше', exact: true }).isEnabled()) await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.locator('.reader-end').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Отрывок прочитан', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Взять в магазине', exact: true }).click();
  await page.getByRole('link', { name: 'Выбрать магазин', exact: true }).click();
  await page.getByRole('radio', { name: /Атриум/ }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Атриум/ })).toBeChecked();
  await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await expect(page.locator('.done-store')).toContainText('Земляной Вал, 33');
  await expect(page.locator('.done-store')).toContainText('бронь до');
  const id = await page.evaluate(() => JSON.parse(sessionStorage.getItem('chitai-selection-v2')!).confirmation.bookId);
  await page.getByRole('link', { name: 'Посмотреть вопрос' }).click();
  await page.getByRole('button', { name: 'Читаю, нравится' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Показать похожие книги' }).click();
  await expect(page.getByRole('heading', { name: 'Ваша подборка готова' })).toBeVisible({ timeout: 7000 });
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('chitai-selection-v2')!).resultIds)).not.toContain(id);
  expect(errors).toEqual([]);
});

test('no-stock, electronic book, reading link and opt-out', async ({ page }) => {
  await page.goto('/#/pickup/white-nights');
  await expect(page.getByRole('button', { name: 'Забронировать', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Сообщить, когда появится' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Демо: уведомление отмечено' })).toBeDisabled();
  await page.getByRole('link', { name: 'Электронная версия', exact: true }).click();
  await expect(page.locator('input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Оплатить демозаказ' }).click();
  await expect(page.getByRole('link', { name: 'Открыть книгу' })).toBeVisible();
  await page.getByRole('link', { name: 'Посмотреть вопрос' }).click();
  await page.getByRole('button', { name: 'Не спрашивать о чтении' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Больше не будем спрашивать' })).toBeVisible();
});

test('delivery, unread reminder and saved position', async ({ page }) => {
  await choose(page);
  const first = await page.locator('.book-card h2').allTextContents();
  await page.getByRole('button', { name: 'Другие варианты' }).click();
  await expect(page.locator('.book-card')).toHaveCount(3, { timeout: 7000 });
  const second = await page.locator('.book-card h2').allTextContents();
  expect(second.every(title => !first.includes(title))).toBe(true);
  await page.getByRole('link', { name: 'Читать отрывок', exact: true }).first().click();
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.getByRole('link', { name: 'Купить', exact: true }).click();
  await page.getByRole('radio', { name: /Бумажная с доставкой/ }).check();
  await page.getByRole('link', { name: 'Продолжить', exact: true }).click();
  await page.getByLabel('Адрес для демозаказа').fill('Вымышленный адрес, 10');
  await page.getByRole('button', { name: 'Оплатить демозаказ' }).click();
  await expect(page.locator('.done-store')).toContainText('Вымышленный адрес, 10');
  await page.getByRole('link', { name: 'Посмотреть вопрос' }).click();
  await page.getByRole('button', { name: 'Не начал(а)', exact: true }).click();
  await page.getByRole('button', { name: 'Показать напоминание с закладкой' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Демо: одно напоминание показано' })).toBeDisabled();
  await page.getByRole('link', { name: 'Продолжить чтение' }).click();
  await expect(page.locator('.reader-page-controls')).toContainText('Страница 2');
});

test('layout, keyboard, local assets and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const externalRequests: string[] = [];
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:5173') && !req.url().startsWith('data:')) externalRequests.push(req.url()); });
  await page.addInitScript(() => sessionStorage.setItem('chitai-selection-v2', JSON.stringify({ purchasedIds: ['white-nights'], confirmation: { mode: 'buy', format: 'ebook', bookId: 'white-nights', number: 'ДЕМО', createdAt: Date.now() } })));
  for (const route of ['/', '/#/quiz/time', '/#/book/white-nights', '/#/read/white-nights', '/#/receive/white-nights', '/#/pickup/white-nights', '/#/checkout/white-nights', '/#/done', '/#/follow-up/white-nights']) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    if (route.includes('/read/')) await expect(page.locator('.reader-paper')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  }
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();
  expect(externalRequests).toEqual([]);
});
