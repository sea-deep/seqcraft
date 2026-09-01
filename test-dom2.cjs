const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1000));
  
  const html = await page.evaluate(() => {
    const root = document.getElementById('root');
    const appContainer = root.firstChild;
    return appContainer.children[1].outerHTML; // Should be the panel group!
  });
  console.log(html.substring(0, 2000));
  await browser.close();
})();
