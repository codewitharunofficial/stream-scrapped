import { load } from "cheerio";
import randomDelays from "./randomDelays.js";
import { browser } from "../../Instances/browser.js";

export default async function finalDownloadLink(url) {
  try {

    // await browser.setCookie(...cookies);
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://www.google.com",
      "Accept-Language": "en-US,en;q=0.9",
    });

    // await page.setViewport({ width: 1920, height: 1000 });
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.setRequestInterception(true);

    // await page.screenshot({ path: "sc2.png" });

    page.on("request", (request) => {
      const blockedResources = ["doubleclick.net", "adservice.google.com"];
      console.log("Request URL : ", request.url());
      console.log("Headers: ", request.headers());
      if (blockedResources.some((url) => request.url().includes(url))) {
        // console.log("Blocked Ad: ", request.url());
        request.abort();
      } else {
        request.continue();
      }
    });

    let videoUrl;

    page.on("response", async (response) => {
      const url = response.url();
      const contentType = response.headers()["content-type"];

      if (
        contentType &&
        contentType.startsWith("video" || contentType.endsWith(".mkv"))
      ) {
        console.log("Video URL from response:", url);
        videoUrl = url;
      }
    });

    await page.screenshot({path: 'finalPage.png'})

    // await page.waitForSelector("div", { visible: true });

    await page.evaluate(() => {
      const elems = document.getElementsByName("div");
      console.log(elems);
    });

    // // await page.waitForSelector("a.btn.btn-success", { visible: true });

    await page.click("div#generate");

    console.log("Clicked Initial");

    await page.waitForSelector("button#ins", { visible: true });

    await page.evaluate(() => {
      document.getElementById("ins").click();
    });

    while (true) {
      const isDisabled = await page.evaluate(() => {
        const button = document.querySelector('button[id="ins"]');
        return button ? button.getAttribute("disabled") : null;
      });

      if (isDisabled === "") {
        // await page.screenshot({ path: "beforClick.png" });
        console.log("Button is Enabled");
        await randomDelays(1000, 2000);
        await page.evaluate(() => {
          document.getElementById("ins").click();
        });
        await randomDelays(3000, 5000);
        break;
      } else {
        // await page.screenshot({ path: "beforClick.png" });

        await page.evaluate(() => {
          const elems = document.getElementsByName("div");
          // elems;
          console.log(elems);
        });
        await page.click("div#generate");

        await randomDelays(3000, 5000);
      }
    }

    // await page.evaluate(() => {
    //   const href = await window
    // })

    // await page.screenshot({ path: "newPage2.png" });

    const html = await page.content();

    const $ = load(html);

    // console.log($("div#generate").html());

    // videoUrl = $("a.btn.btn-success").attr("href");
    // console.log("VideoLink: ", videoUrl);

    await page.close();

    return videoUrl;
  } catch (error) {
    console.log(error);
    return error;
  }
}
