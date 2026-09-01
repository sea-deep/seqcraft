const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1000));
  
  const layout = await page.evaluate(() => {
    const res = {};
    const project = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('PROJECT') && d.textContent.includes('DNA Sequences'));
    if (project) {
      const rect = project.getBoundingClientRect();
      res.projectWidth = rect.width;
      res.projectHeight = rect.height;
    }
    
    const inspector = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Inspector') && d.textContent.includes('Topology'));
    if (inspector) {
      const rect = inspector.getBoundingClientRect();
      res.inspectorWidth = rect.width;
    }
    
    return res;
  });
  console.log(layout);
  await browser.close();
})();
