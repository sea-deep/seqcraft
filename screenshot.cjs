const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:5174');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
