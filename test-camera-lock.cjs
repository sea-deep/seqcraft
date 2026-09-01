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

  // Helper to read current camera position & orientation
  const getCameraInfo = async () => {
    return page.evaluate(() => {
      // Return canvas transform or canvas webgl context info if needed, or inspect Three.js camera
      return window.__three_camera_pos || null;
    });
  };

  // 1. Drag along the plasmid backbone: cx + 290, cy to cx + 200, cy + 200
  await page.mouse.move(cx + 290, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 260, cy + 120);
  await page.mouse.move(cx + 200, cy + 200);
  await page.mouse.move(cx + 100, cy + 270);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'lock_test_1_stationary_selection.png' });

  // 2. Drag empty canvas to rotate camera (at center cx, cy)
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy - 80);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'lock_test_2_camera_rotated.png' });

  // 3. Select nucleotide range again after manual rotation
  await page.mouse.move(cx + 250, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 180, cy + 150);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'lock_test_3_selection_after_rotation.png' });

  await browser.close();
  console.log('Camera lock test completed successfully.');
})();
