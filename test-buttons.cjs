const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForSelector('text/Import sequence');
  await page.click('text/Import sequence');
  
  // Wait for dialog to appear
  try {
    await page.waitForSelector('text/Import Sequence', { timeout: 2000 });
    console.log("SUCCESS: Import Dialog opened from Sidebar!");
  } catch(e) {
    console.log("FAIL: Import Dialog did not open from Sidebar!");
  }

  await browser.close();
})();
