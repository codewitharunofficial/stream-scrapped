import { load } from "cheerio";
import  getBrowserInstance from "../../Instances/browser.js";
import finalDownloadLink from "./finalDownloadLink.js";


export default async function DownloadLink(url) {
  console.log("Url to visit: ", url);
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://tech.unbloackgames.world",
      "Accept-Language": "en-US,en;q=0.9",
    });

    // await page.setViewport({ width: 1920, height: 1000 });
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const blockedResources = ["doubleclick.net", "adservice.google.com"];
      if (blockedResources.some((url) => request.url().includes(url))) {
        console.log("Blocked Ad: ", request.url());
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.waitForSelector("a.btn", {
      visible: true,
    });
    // await page.screenshot({ path: "newPage.png" });

    await page.$$eval("a.btn", (element) => {
      console.log(element[1].getAttribute("href"));

      element.map((el) => console.log(el.className));
    });

    const resumeable = await page.$("a.btn.btn-warning");

    if (resumeable) {
      await resumeable.click();
      console.log("Found Resumable and clicked");
    } else {
      console.log("Not Found Resumable So One Time Clicked");
      await page.click("a.btn.btn-danger");
    }

    // const cookies = await browser.cookies();

    const newHtml = await page.content();

    await page.close();

    const $ = load(newHtml);

    const link = $("a.btn.btn-danger").attr("href");

    // if (await page.$("a.btn.btn-warning")) {
    //   link = $("a.btn.btn-warning").attr("href");
    // } else {
    //   link = link = $("a.btn.btn-danger").attr("href");
    // }

    console.log("Link: ", link);

    if (link) {
      const videoLink = await finalDownloadLink(link);
      console.log(videoLink);
      return videoLink;
    }
  } catch (error) {
    console.log(error);
    return;
  }
}
