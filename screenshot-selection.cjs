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

  // Find document id and AmpR id
  // Let's get the store state and trigger selection programmatically to guarantee precision
  // We can't access `useWorkspaceStore` directly if it's not exported globally, 
  // but we CAN click the feature in the Sequence view first, then switch to Map!
  
  // Actually, we can click AmpR in the Sequence view (the inspector has a button, or the sequence view has a button).
  // Or we can just evaluate a script that finds the feature id for AmpR and clicks it.
  
  // Let's just switch back to Sequence, find the AmpR feature, and click it.
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  // Click AmpR in Sequence view
  await page.evaluate(() => {
    const featureLabels = Array.from(document.querySelectorAll('div'));
    const ampr = featureLabels.find(d => d.textContent === 'AmpR' && d.style.backgroundColor);
    if (ampr) {
      ampr.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Switch to Map and take screenshot (AmpR selected)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_3d_ampr_selected.png' });
  
  // Switch to Sequence, click ori
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Sequence'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const featureLabels = Array.from(document.querySelectorAll('div'));
    const ori = featureLabels.find(d => d.textContent === 'rep_origin' && d.style.backgroundColor);
    if (ori) {
      ori.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot of sequence view (ori selected)
  await page.screenshot({ path: 'screenshot_sequence_ori_selected.png' });
  
  // Switch to Map and take screenshot (ori selected)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(b => b.innerText.includes('Map'));
    if(b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_3d_ori_selected.png' });

  await browser.close();
})();
