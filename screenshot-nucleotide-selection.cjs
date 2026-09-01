const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Set selection 121..180 on sequence in store via browser evaluation
  await page.evaluate(() => {
    // In our app, we can find the active document and call store or simulate mouse drag
    // Let's find useWorkspaceStore if exposed, or click/drag across bases
    // We can directly dispatch an event or use the React fiber to call setSelection
    const el = document.querySelector('[data-index="2"]'); // line index ~121-180
  });

  // Let's drag select 121..180 on sequence view
  // Sequence line 3 begins around index 121 (0-based 120)
  // Let's simulate mouse drag across line 3
  const lines = await page.$$('[data-index]');
  if (lines.length > 2) {
    const box = await lines[2].boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + box.height / 2);
      await page.mouse.up();
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_sequence_nucleotide_selected.png' });
  
  // Switch to Map
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot_map_short_selection.png' });

  // Now switch back to Sequence, select a longer region
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Drag select longer region (drag across multiple lines)
  const lineStart = await lines[4]?.boundingBox();
  const lineEnd = await lines[10]?.boundingBox();
  if (lineStart && lineEnd) {
    await page.mouse.move(lineStart.x + 50, lineStart.y + 10);
    await page.mouse.down();
    await page.mouse.move(lineEnd.x + 400, lineEnd.y + 10);
    await page.mouse.up();
  }
  await new Promise(r => setTimeout(r, 1000));

  // Switch to Map and take screenshot
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot_map_long_selection.png' });

  await browser.close();
})();
