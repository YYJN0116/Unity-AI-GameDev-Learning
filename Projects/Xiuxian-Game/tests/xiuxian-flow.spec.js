const { test, expect } = require('@playwright/test');

const pendingPayload = {
  schemaVersion: '0.1',
  result: {
    narration: '自动化流程测试：线索不足，暂不结算；本条不属于正式剧情。',
    observations: ['仅测试网页 pending 流程。'],
    actionOutcome: 'pending',
    decisionBasis: '自动化测试数据，不判定游戏事实。',
    timeCostMinutes: 0,
    resourceChanges: [],
    relationshipEventChanges: [],
    nextActions: ['继续测试结算流程。'],
    storyHook: null
  },
  statePatch: {}
};

const successPayload = {
  schemaVersion: '0.1',
  result: {
    narration: '自动化流程测试完成：pending 后的行动成功继续结算；本条不属于正式剧情。',
    observations: ['测试确认行动在 pending 后仍被保留。'],
    actionOutcome: 'success',
    decisionBasis: '自动化测试数据，不判定游戏事实。',
    timeCostMinutes: 0,
    resourceChanges: [],
    relationshipEventChanges: [],
    nextActions: [],
    storyHook: null
  },
  statePatch: {}
};

test('选择行动、生成提示词、pending 后继续结算并保存恢复', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '修仙世界记录簿' })).toBeVisible();
  await expect(page.locator('#character-card')).toBeVisible();
  await expect(page.locator('#action-buttons')).toBeVisible();

  await page.getByRole('button', { name: '探索' }).click();
  await page.locator('#player-choice').fill('自动化网页测试：验证 pending 后行动能继续结算。');
  await page.getByRole('button', { name: '生成 AI 主持提示词' }).click();

  const promptValue = await page.locator('#ai-prompt').inputValue();
  expect(promptValue).toContain('行动类型：探索');
  expect(promptValue).toContain('自动化网页测试');

  await page.locator('#ai-response').fill(JSON.stringify(pendingPayload));
  await page.getByRole('button', { name: '解析并预览' }).click();
  await expect(page.locator('#app-message')).toContainText('JSON 结构有效');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '确认并应用状态更新' }).click();
  await expect(page.locator('#app-message')).toContainText('本次结果仍待结算；当前行动已保留');

  await page.locator('#ai-response').fill(JSON.stringify(successPayload));
  await page.getByRole('button', { name: '解析并预览' }).click();
  await expect(page.locator('#app-message')).toContainText('JSON 结构有效');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '确认并应用状态更新' }).click();
  await expect(page.locator('#app-message')).toContainText('本次状态变化已应用并保存');

  const saved = await page.evaluate(() => localStorage.getItem('xiuxian-world-journal-v0.2') || localStorage.getItem('xiuxian-world-journal-v0.1'));
  expect(saved).not.toBeNull();

  await page.reload();
  await expect(page.locator('#character-card')).toBeVisible();
  await expect(page.locator('#story-log')).toContainText('自动化流程测试完成');
  await expect(page.locator('#current-date')).not.toHaveText('-');

  const restored = await page.evaluate(() => localStorage.getItem('xiuxian-world-journal-v0.2') || localStorage.getItem('xiuxian-world-journal-v0.1'));
  expect(restored).not.toBeNull();
});
