const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Map tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // On pUC19, coordinate 0 is at 12 o'clock (PI/2).
  // Backbone radius in pixels on 768px height is ~190-200px.
  // Let's drag across 12 o'clock: from top-left (cx - 60, cy - 190) to top-right (cx + 60, cy - 190)
  await page.mouse.move(cx - 60, cy - 190);
  await page.mouse.down();
  await page.mouse.move(cx - 30, cy - 200);
  await page.mouse.move(cx, cy - 205);
  await page.mouse.move(cx + 30, cy - 200);
  await page.mouse.move(cx + 60, cy - 190);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_origin_clean.png' });

  await browser.close();
})();
