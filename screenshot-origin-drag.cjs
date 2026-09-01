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

  // Origin spanning drag across 12 o'clock:
  // Start at top left (cx - 80, cy - 190) -> move clockwise to top right (cx + 80, cy - 190)
  await page.mouse.move(cx - 80, cy - 190);
  await page.mouse.down();
  await page.mouse.move(cx - 40, cy - 205);
  await page.mouse.move(cx, cy - 210);
  await page.mouse.move(cx + 40, cy - 205);
  await page.mouse.move(cx + 80, cy - 190);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot_direct_origin_spanning_selection.png' });

  await browser.close();
})();
