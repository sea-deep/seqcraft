const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1000));
  
  const html = await page.evaluate(() => document.getElementById('root')?.innerHTML.substring(0, 1000));
  console.log(html);
  await browser.close();
})();
