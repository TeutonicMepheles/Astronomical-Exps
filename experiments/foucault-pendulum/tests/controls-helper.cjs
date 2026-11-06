async function showDeveloperControls(page) {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' })));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#debugButton')).pointerEvents === 'auto');
}

module.exports = { showDeveloperControls };
