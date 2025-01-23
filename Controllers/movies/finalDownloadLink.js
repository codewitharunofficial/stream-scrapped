import getBrowserInstance from "../../Instances/browser.js";
import { load } from "cheerio";

export async function FinalLinkMovie(link) {
    try {
      const url = `https://driveleech.org${link}`;
  
      // await browser.setCookie(...cookies);
      const browser = await getBrowserInstance();
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
  
      
      await page.waitForSelector("a.btn.btn-success", { visible: true });
  
      await page.click("div#generate");
  
      console.log("Clicked Initial");
  
     
  
      const html = await page.content();
  
      const $ = load(html);
  
      // console.log($("div#generate").html());
  
      videoUrl = $("a.btn.btn-success").attr("href");
      console.log("VideoLink: ", videoUrl);
  
      await page.close();
  
      return videoUrl;
    } catch (error) {
      console.log(error);
      throw new Error("Something Went wrong",  error);
    }
  }