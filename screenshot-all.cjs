const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  // Actually the dev server is at 5173 now because it restarted?
  // Let me just check where it is
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot_sequence.png' });
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'screenshot_map.png' });
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Compare'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'screenshot_compare.png' });
  
  await browser.close();
})();
