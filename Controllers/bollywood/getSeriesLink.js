import { load } from "cheerio";
import getBrowserInstance from "../../Instances/browser.js";
import randomDelays from "../Series/randomDelays.js";

export default async function getSeriesLink(slug, quality, episode, season) {
  try {
    console.log("Okay Starting...!");

    console.log(slug);
    const url = `https://gadg8.in/${slug}`;

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

    await page.waitForSelector("button#loadDataButtonSeries", {
      visible: true,
    });

    await page.click("button#loadDataButtonSeries");

    console.log("Season Selected");

    await page.evaluate(() => {
      document.getElementById("loadDataButtonSeries").click();

      console.log("Load Button Clicked");
    });

    await randomDelays(2000, 5000);

    await page.waitForSelector("div.tvshows-popup-content", { visible: true });

    await page.click(`button[data-season='${season}']`);

    await page.waitForSelector(`div[data-season='${season}']`, {
      visible: true,
    });
    console.log("Found Episodes list");

    await page.waitForSelector(
      `div[data-season='${season}'] div[data-index='${episode - 1}']`,
      { visible: true }
    );

    console.log("Found The Div");

    await page.click(
      `div[data-season='${season}'] div[data-index='${episode}'] button:nth-child(${1})`
    );

    console.log("Clicked");

    // const btns = await page.$$eval(`div[data-index='${episode}'] button`, (buttons) => {
    //   buttons.map((btn) => ({
    //     class: btn.className
    //   }));
    // });

    // console.log(btns);

    // await page.screenshot({ path: "sc.png" });

    await new Promise((resolve) => setTimeout(resolve, 6000));

    const fileUri = await page.evaluate(() => window.interceptedFileUrl);

    console.log(fileUri);

    return fileUri;
  } catch (error) {
    console.error("Error during scraping:", error);
    throw new Error("Something Went wrong", error);
  }
}
