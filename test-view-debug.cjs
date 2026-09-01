const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  await page.waitForSelector('text/View');
  await page.click('text/View');
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.waitForSelector('text/Features');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"]')).filter(e => e.textContent.includes('Features'));
    if (items.length > 0) items[0].click();
  });
  
  await new Promise(r => setTimeout(r, 500));
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Body text contains View will appear here:", text.includes('View will appear here'));

  await browser.close();
})();
