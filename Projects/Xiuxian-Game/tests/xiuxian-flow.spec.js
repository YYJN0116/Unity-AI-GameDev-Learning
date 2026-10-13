const { test, expect } = require('@playwright/test');

const pendingPayload = {
  schemaVersion: '0.1',
  result: {
    narration: '我在山间废墟前停住脚步，风声里有几丝不自然的波动，先不要急着定论。',
    observations: ['山间雾气变浓', '地面有新鲜脚印'],
    actionOutcome: 'pending',
    decisionBasis: '线索不足，先维持行动并等待更多信息。',
    timeCostMinutes: 0,
    resourceChanges: [
      {
        label: '体力',
        before: '轻微',
        change: '-1',
        after: '轻微',
        reason: '探索消耗体力'
      }
    ],
    relationshipEventChanges: ['未产生新的关系变化'],
    nextActions: ['继续查看脚印方向', '观察周边隐秘出口'],
    storyHook: '远处突然传来一声清脆鸟鸣，像是有人在林子深处压低声音。',
    statePatch: {}
  }
};

const successPayload = {
  schemaVersion: '0.1',
  result: {
    narration: '我沿着脚印循着其中一条路，最终确认这只是猎人留下的痕迹，未伤及主线。',
    observations: ['脚印属于普通兽类', '周围无明显敌意'],
    actionOutcome: 'success',
    decisionBasis: '观察足够充分，且未发现危险信号。',
    timeCostMinutes: 0,
    resourceChanges: [
      {
        label: '体力',
        before: '轻微',
        change: '-1',
        after: '轻微',
        reason: '探索与观察耗费体力'
      }
    ],
    relationshipEventChanges: ['无明显人际变化'],
    nextActions: ['记录发现', '决定下一步行动'],
    storyHook: '木林深处有一片闪烁的灵光，像是新地标的起点。',
    statePatch: {}
  }
};

test('Xiuxian browser flow: select action, generate prompt, pending then success, save and reload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '修仙世界记录簿' })).toBeVisible();
  await expect(page.locator('#character-card')).toBeVisible();
  await expect(page.locator('#action-buttons')).toBeVisible();

  await page.getByRole('button', { name: '探索' }).click();
  await page.locator('#player-choice').fill('我在山谷边缘细看脚印和残叶，留意是否有隐藏洞口。');
  await page.getByRole('button', { name: '生成 AI 主持提示词' }).click();

  const promptValue = await page.locator('#ai-prompt').inputValue();
  expect(promptValue.length).toBeGreaterThan(100);

  await page.locator('#ai-response').fill(JSON.stringify(pendingPayload));
  await page.getByRole('button', { name: '解析并预览' }).click();
  await expect(page.locator('#app-message')).toContainText('JSON 结构有效');

  await page.getByRole('button', { name: '确认并应用状态更新' }).click();
  await expect(page.locator('#app-message')).toContainText('本次结果仍待结算');

  await page.locator('#ai-response').fill(JSON.stringify(successPayload));
  await page.getByRole('button', { name: '解析并预览' }).click();
  await page.getByRole('button', { name: '确认并应用状态更新' }).click();
  await expect(page.locator('#app-message')).toContainText('本次状态变化已应用并保存');

  const saved = await page.evaluate(() => localStorage.getItem('xiuxian-world-journal-v0.1'));
  expect(saved).not.toBeNull();

  await page.reload();
  await expect(page.locator('#character-card')).toBeVisible();
  await expect(page.locator('#story-log')).toContainText('我沿着脚印循着其中一条路');
  await expect(page.locator('#current-date')).not.toHaveText('-');

  const loaded = await page.evaluate(() => localStorage.getItem('xiuxian-world-journal-v0.1'));
  expect(loaded).not.toBeNull();
});
