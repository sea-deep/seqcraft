const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173');
  
  await new Promise(r => setTimeout(r, 1000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Body text contains PROJECT:", text.includes('PROJECT'));
  console.log("Body text contains INSPECTOR:", text.includes('INSPECTOR'));

  await browser.close();
})();
