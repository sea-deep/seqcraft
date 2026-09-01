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

  // Real radius is ~280-300px from center.
  // Drag across 12 o'clock (coordinate 0):
  // Start at top-left: cx - 120, cy - 270 (approx coord ~2550)
  // Drag clockwise through top (cx, cy - 300, coord 0) to top-right (cx + 120, cy - 270, coord ~130)
  await page.mouse.move(cx - 120, cy - 270);
  await page.mouse.down();
  await page.mouse.move(cx - 60, cy - 290);
  await page.mouse.move(cx, cy - 300);
  await page.mouse.move(cx + 60, cy - 290);
  await page.mouse.move(cx + 120, cy - 270);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot_direct_origin_spanning_selection.png' });

  // Switch to sequence view to show origin-spanning selection in Sequence
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_origin_spanning_in_sequence.png' });

  await browser.close();
})();
