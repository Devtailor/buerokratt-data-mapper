import * as puppeteer from 'puppeteer-core';

let browser: puppeteer.Browser | undefined;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (browser) return browser;

  const launchOptions: puppeteer.LaunchOptions = {
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-infobars',
      '--headless=new',
    ],
  };

  launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

  browser = await puppeteer.launch(launchOptions);

  return browser;
}

export async function convertHtmlToPdf(html: string): Promise<string> {
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();

      if (url.startsWith('data:')) {
        request.continue();
      } else {
        request.abort();
      }
    });

    await page.setJavaScriptEnabled(false);

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 0,
    });

    const uintArray = await page.pdf({
      format: 'A4',
      printBackground: true,
      timeout: 0,
    });
    const base64 = Buffer.from(uintArray).toString('base64');

    await page.close();

    return base64;
  } catch (error) {
    console.error('convertHtmlToPdf: error', error);
    await browser.close();
    console.debug('convertHtmlToPdf: closed browser on error');
    throw error;
  }
}
