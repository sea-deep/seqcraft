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
  // Backbone radius in screen pixels is approx 200-240px from center.
  // Top of ring is (cx, cy - 210)
  // 1. Direct drag short selection on 3D Map (near top right)
  await page.mouse.move(cx + 40, cy - 200);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy - 140);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_short_selection.png' });

  // 2. Switch to Sequence view to confirm the exact short selection is reflected
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_short_in_sequence.png' });

  // 3. Switch back to Map, do a longer drag selection
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Drag from right (cx + 200, cy) to bottom (cx, cy + 200)
  await page.mouse.move(cx + 200, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 140, cy + 140);
  await page.mouse.move(cx, cy + 200);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_long_selection.png' });

  // 4. Do an origin-spanning drag selection across 12 o'clock (top)
  // Drag from top-left (cx - 100, cy - 180) across top (cx, cy - 210) to top-right (cx + 100, cy - 180)
  await page.mouse.move(cx - 120, cy - 170);
  await page.mouse.down();
  await page.mouse.move(cx - 50, cy - 200);
  await page.mouse.move(cx, cy - 210);
  await page.mouse.move(cx + 50, cy - 200);
  await page.mouse.move(cx + 120, cy - 170);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_direct_origin_spanning_selection.png' });

  await browser.close();
})();
