import { load } from "cheerio";
import getBrowserInstance from "../../Instances/browser.js";
import randomDelays from "../Series/randomDelays.js";

export default async function getSeries(slug, quality) {
  try {
    console.log("Okay Starting...!");

    console.log(slug);
    const url = `https:gadg8.in/${slug}`;

    // Launch Puppeteer with the chromium binary provided by chrome-aws-lambda
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://google.com",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    // console.log("Response status:", page.st);

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const blockedResources = ["doubleclick.net", "adservice.google.com"];
      if (blockedResources.some((url) => request.url().includes(url))) {
        // console.log("Blocked Ad: ", request.url());
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.evaluate(() => {
      window.interceptedFileUrl = null;
      const originalAppendChild = document.body.appendChild;

      document.body.appendChild = function (node) {
        if (node instanceof HTMLAnchorElement && node.href) {
          console.log("Intercepted Link: ", node.href);
          window.interceptedFileUrl = node.href;
        }
        return originalAppendChild.call(this, node);
      };
    });

    // Get the page content as HTML

    await page.waitForSelector("button#loadDataButtonSeries", { visible: true });

    await page.evaluate(() => {
      document.getElementById("loadDataButtonSeries").click();

      console.log("Load Button Clicked");
    });

    await randomDelays(2000, 5000);



    await page.waitForSelector("div.tvshows-popup-content", { visible: true });

    const $ = load(await page.content());

    // Close the browser
    await browser.close();

    const links = [];
     
     $("div.tvshows-episode-group").each((i, el) => {
        console.log($(el).html());
     })

    return fileUri;
  } catch (error) {
    console.error("Error during scraping:", error);
    return error;
  }
}
