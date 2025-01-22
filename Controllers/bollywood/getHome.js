import { load } from "cheerio";
import getBrowserInstance from "../../Instances/browser.js";

export default async function getHome () {

    try {
        console.log("Okay Starting...!");
    
        // console.log(req.query.slug);
        const url = `https:gadg8.in`;
    
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
        await page.goto(url, { waitUntil: "domcontentloaded" });
        // console.log("Response status:", page.st);
    
        // Get the page content as HTML
        const html = await page.content();
    
        // Close the browser
        await browser.close();
    
        // Load HTML into Cheerio for parsing (you can continue with your scraping logic here)
        if (html) {
          const $ = load(html);
    
          const trendings = [];
    
          $("div.alm-listing.alm-ajax")
            .find("div.alm-item")
            .each((i, el) => {
              const title = $(el)
                .find("div.alm-content-wrapper")
                .children("a")
                .find("h3")
                .text()
                .trim();
              const thumbnail = $(el)
                .find("div.alm-thumbnail-wrapper")
                .find("img")
                .attr("src");
              const slug = $(el)
                .find("div.alm-content-wrapper")
                .children("a")
                .attr("href")
                .split("/");
              const published_at = $(el)
                .find("div.alm-content-wrapper")
                .find("p.alm-meta-date")
                .text()
                .trim();
    
              const season = $(el).find("div.alm-update-section").find("p.alm-update-section-p").text().trim();
    
              if(season.length <= 0){
    
                trendings.push({
                  title: title,
                  thumbnail: thumbnail,
                  slug: slug[slug.length - 2],
                  published_at: published_at,
                });
              } else {
                trendings.push({
                  title: title,
                  thumbnail: thumbnail,
                  slug: slug[slug.length - 2],
                  published_at: published_at,
                  season: season
                });
              }
    
            });
    
            return trendings;
        }
      } catch (error) {
        console.error("Error during scraping:", error);
        return error;
      }
}
