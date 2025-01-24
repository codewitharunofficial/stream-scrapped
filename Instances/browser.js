import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

let browserInstance = null;

const getBrowserInstance = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      waitForInitialPage: true
    });
    console.log("Brower Instance Created");
  }
  return browserInstance;
};

export default getBrowserInstance;
