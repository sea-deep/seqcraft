const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // 1. Document state
  await page.screenshot({ path: 'screenshot_inspector_doc.png' });
  
  // 2. Feature state
  // Click on AmpR feature track
  await page.evaluate(() => {
    // find a feature segment, preferably AmpR which has indigo color or text AmpR
    const all = Array.from(document.querySelectorAll('div'));
    const feature = all.find(d => d.textContent === 'AmpR' && d.classList.contains('cursor-pointer'));
    if (feature) feature.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'screenshot_inspector_feature.png' });

  // 3. Selection state
  // Click and drag on sequence text
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'screenshot_inspector_selection.png' });
  
  await browser.close();
})();
