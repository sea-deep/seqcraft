const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Map
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // screenshot 1: default
  await page.screenshot({ path: 'screenshot_camera_default.png' });
  
  // Switch to sequence, click AmpR, switch to Map
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const featureLabels = Array.from(document.querySelectorAll('div'));
    const ampr = featureLabels.find(d => d.textContent === 'AmpR' && d.style.backgroundColor);
    if (ampr) ampr.click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  
  // wait for animation to complete
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_camera_ampr_focused.png' });
  
  // Sequence -> ori
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const featureLabels = Array.from(document.querySelectorAll('div'));
    const ori = featureLabels.find(d => d.textContent === 'rep_origin' && d.style.backgroundColor);
    if (ori) ori.click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_camera_ori_focused.png' });

  await browser.close();
})();
