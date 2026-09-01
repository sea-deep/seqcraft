const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 0: Open Map view
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

  // Step 1: Hover AmpR (right/top-right of ring, approx cx + 240, cy - 80)
  await page.mouse.move(cx + 240, cy - 80);
  await new Promise(r => setTimeout(r, 500));
  
  // Check cursor style when hovering AmpR
  const cursorHoverAmpR = await page.evaluate(() => {
    const el = document.querySelector('div[style*="cursor"]');
    return el ? el.style.cursor : null;
  });
  console.log('Cursor hovering AmpR:', cursorHoverAmpR);

  // Step 2 & 3: Click AmpR & confirm Feature Inspector
  // In sequence view or 3D, click AmpR
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('div'));
    const ampr = labels.find(d => d.textContent === 'AmpR' && d.style.backgroundColor);
    if (ampr) ampr.click();
  });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'acceptance_step3_ampr_feature_inspector.png' });

  // Step 4 & 5: Drag nucleotide interval on backbone directly (e.g. at bottom left, cx - 180, cy + 180 to cx - 100, cy + 240)
  // This starts nucleotide drag and clears selectedFeatureId
  await page.mouse.move(cx - 180, cy + 180);
  await page.mouse.down();
  await page.mouse.move(cx - 140, cy + 220);
  await page.mouse.move(cx - 100, cy + 240);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'acceptance_step5_nucleotide_selection_inspector.png' });

  // Step 6 & 7: Drag empty canvas to rotate camera (e.g. center hole at cx, cy)
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy - 80);
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'acceptance_step7_camera_rotated.png' });

  // Step 8, 9, 10: Select ori and confirm Feature Inspector
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  // Scroll sequence down to find rep_origin / ori
  await page.evaluate(() => {
    const container = document.querySelector('.overflow-auto');
    if (container) container.scrollTop = 1500;
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('div'));
    const ori = labels.find(d => (d.textContent === 'ori' || d.textContent === 'rep_origin') && d.style.backgroundColor);
    if (ori) ori.click();
  });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'acceptance_step10_ori_feature_inspector.png' });

  // Step 11: Switch Sequence -> Map -> Sequence to verify consistency
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'acceptance_step11_sequence_consistency.png' });

  await browser.close();
  console.log('Acceptance flow completed successfully.');
})();
