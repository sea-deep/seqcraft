const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Find cursor-text divs
  const textDivs = await page.$$('div.cursor-text');
  if (textDivs.length > 5) {
    const boxStart = await textDivs[1].boundingBox();
    const boxEnd = await textDivs[5].boundingBox();
    if (boxStart && boxEnd) {
      await page.mouse.move(boxStart.x + 50, boxStart.y + 10);
      await page.mouse.down();
      await page.mouse.move(boxEnd.x + 300, boxEnd.y + 10);
      await page.mouse.up();
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_sequence_longer_selection.png' });

  // Switch to Map
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot_map_longer_selection.png' });

  await browser.close();
})();
