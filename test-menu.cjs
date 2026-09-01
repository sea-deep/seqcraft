const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  await page.waitForSelector('text/File');
  await page.click('text/File');
  
  try {
    await page.waitForSelector('text/Import...', { timeout: 2000 });
    await page.click('text/Import...');
    await page.waitForSelector('text/Import Sequence', { timeout: 2000 });
    console.log("SUCCESS: File -> Import opened dialog!");
  } catch(e) {
    console.log("FAIL: File -> Import failed!", e.message);
  }

  await browser.close();
})();
