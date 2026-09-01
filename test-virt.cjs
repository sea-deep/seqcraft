const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174');
  await new Promise(r => setTimeout(r, 2000));
  
  const info = await page.evaluate(() => {
    const panels = document.querySelectorAll('.overflow-auto');
    let seqViewer = null;
    for (const p of panels) {
      if (p.querySelector('[data-index]')) {
        seqViewer = p;
        break;
      }
    }
    const items = seqViewer.querySelectorAll('[data-index]');
    return Array.from(items).map(i => ({ 
      height: i.clientHeight,
      offsetHeight: i.offsetHeight,
      transforms: i.style.transform
    }));
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
