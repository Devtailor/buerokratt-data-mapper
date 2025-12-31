import * as puppeteer from 'puppeteer';

let browser: puppeteer.Browser | undefined;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (browser) return browser;

  browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      // Necessary with newer versions of Puppeteer
      // https://github.com/puppeteer/puppeteer/issues/12189
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-infobars',
      '--headless=new',
    ],
  });

  return browser;
}

export async function convertHtmlToPdf(html: string): Promise<string> {
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 0 });

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
