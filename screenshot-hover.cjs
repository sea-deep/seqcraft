const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Map
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'screenshot_3d_default.png' });
  
  // Hover AmpR: right side of the ring.
  // Center of canvas:
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  
  // AmpR is at the right side. Let's move mouse to cx + 250, cy
  await page.mouse.move(cx + 250, cy);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_3d_ampr_hover.png' });
  
  // Rotate and hover another (ori, at bottom left)
  // Drag from center to right
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 200, cy);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  
  // Hover top side
  await page.mouse.move(cx, cy - 200);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_3d_rotated_hover.png' });
  
  await browser.close();
})();
