const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  await page.waitForSelector('text/View');
  await page.click('text/View');
  
  try {
    await page.waitForSelector('text/Features', { timeout: 2000 });
    await page.click('text/Features');
    await page.waitForSelector('text/View will appear here.', { timeout: 2000 });
    console.log("SUCCESS: View -> Features opened!");
  } catch(e) {
    console.log("FAIL: View -> Features failed!", e.message);
  }

  await browser.close();
})();
