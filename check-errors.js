import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  
  await page.goto('http://localhost:3000/');
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log('HTML CONTENT:', content.substring(0, 500));
  console.log('URL:', page.url());
  
  await browser.close();
})();
