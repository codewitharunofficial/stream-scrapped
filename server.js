import express from "express";
import { load } from "cheerio";
import cron from "node-cron";
import DownloadLink from "./Controllers/Series/getDownloadLink.js";
import getBrowserInstance from "./Instances/browser.js";
import { getMovieDownloadLink } from "./Controllers/movies/getDownloadLink.js";
import getMovie from "./Controllers/bollywood/getMovie.js";
import getHome from "./Controllers/bollywood/getHome.js";
import getSeries from "./Controllers/bollywood/getSeries.js";
import getSeriesLink from "./Controllers/bollywood/getSeriesLink.js";
import dotenv from "dotenv";
import connectToDB from "./DB/mongoDB.js";
import request from "request";
import url from "url";
let puppeteer;
if(process.env.NODE_ENV === "production") {
  puppeteer = await import("puppeteer-core");
} else {
  puppeteer = await import("puppeteer");
}
import chromium from "@sparticuz/chromium";
import axios from "axios";

dotenv.config();

// connectToDB();

const app = express();

// Set the port to listen on (use process.env.PORT for Heroku)
const PORT = process.env.PORT || 3001;

app.get("/get-series", async (req, res) => {
  try {
    console.log("Okay Starting...!");
    const { slug } = req.query;
    const episode = req.query?.episode ? req.query?.episode : 1;
    const url = `https://uhdmovies.bet/${slug}`;

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

    // await page.setViewport({ width: 1920, height: 1000 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // await new Promise((resolve) => setTimeout(resolve, 15000));

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // await page.waitForNavigation({waitUntil: "networkidle0"});
    // console.log("Response status:", page.st);
    // await page.screenshot({ path: "uhdmovies_home.png" });

    // Get the page content as HTML
    const html = await page.content();

    // Close the browser
    await page.close();

    // res.setHeader("Content-Type", "application/json");
    // res.setHeader("Transfer-Encoding", "chunked");
    // res.status(200);

    // Load HTML into Cheerio for parsing (you can continue with your scraping logic here)
    if (html) {
      const $ = load(html);

      const description = $("p")
        .text()
        .trim()
        .replaceAll("MoviesMod Team · Powered by MoviesMod", "codewitharun");

      const episodes = [];

      $("div.entry-content")
        .children("p[style='text-align: center;']")
        .each((x, element) => {
          // console.log($(el).has("a.maxbutton-2.maxbutton.maxbutton-gdrive-episode").length);
          if ($(element).has("strong").text().trim()) {
            // const season = $(element).has("strong").text().trim();
            $(element)
              .next()
              .children()
              .each((i, el) => {
                if (
                  $(el).hasClass(
                    "maxbutton-2 maxbutton maxbutton-gdrive-episode"
                  )
                ) {
                  const href = $(el).attr("href");
                  const title = $(el).children("span.mb-text").text().trim();
                  const episode = $(el)
                    .children("span.mb-text")
                    .text()
                    .trim()
                    .split(" ")[1];
                  const season = $(element).has("strong").text().trim();
                  // console.log(season);
                  episodes.push({
                    season: season,
                    title: title,
                    link: href,
                    episode: parseInt(episode),
                  });
                }
              });
          }
        });

      res.status(200).send({
        success: true,
        video: {
          description: description,
          episodes: episodes,
        },
      });
    }
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
});

app.get("/get-series-link", async (req, res) => {
  try {
    const { url } = req.query;
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

    page.on("request", (request) => {
      const blockedResources = ["doubleclick.net", "adservice.google.com"];
      if (blockedResources.some((url) => request.url().includes(url))) {
        // console.log("Blocked Ad: ", request.url());
        request.abort();
      } else {
        request.continue();
      }
    });

    await randomDelays(15000, 20000);

    await randomDelays(1000, 3000);

    const videoAdCloseBtn = await page.$("rewardCloseButton");

    if (videoAdCloseBtn) {
      await page.click("rewardCloseButton");
      console.log("Ad close Button Clicked");
    }

    await page.waitForSelector("span a", { visible: true });
    await page.click("span a");
    console.log("First Button Clicked");

    await randomDelays(3000, 5000);

    await page.waitForSelector("span#verify_button2", { visible: true });
    await randomDelays(2000, 5000);

    await page.evaluate(() => {
      document.getElementById("verify_button2").click();
      console.log("Button 2 Clicked");
    });

    await randomDelays(10000, 12000);

    await page.waitForSelector("span#verify_button", { visible: true });

    await randomDelays(1000, 2000);

    await page.evaluate(() => {
      document.getElementById("verify_button")?.click();
      console.log("3rd Button Clicked");
    });

    await randomDelays(8000, 10000);

    await page.waitForSelector("a#two_steps_btn", { visible: true });

    await randomDelays(2000, 5000);

    // await page.click("a#two_steps_btn");

    await page.evaluate(() => {
      document.getElementById("two_steps_btn").click();
    });

    console.log("Getting the Page@ link...");

    await randomDelays(2000, 4000);

    // await page.screenshot({ path: "sc.png" });
    // await page.waitForSelector("a.btn", { visible: true });

    const html = await page.content();

    await page.close();

    const $ = load(html);

    const link = $("a#two_steps_btn").attr("href");

    const downloadLink = await DownloadLink(link);

    if (downloadLink) {
      res.status(200).send({ success: true, url: downloadLink });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/get-movie", async (req, res) => {
  try {
    const { slug, quality } = req.query;

    const link = await getMovie(slug, quality);
    if (link && typeof link === "string") {
      res.status(200).send({ success: true, url: link });
    } else {
      res.status(400).send({ success: false });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/home", async (req, res) => {
  try {
    const trendings = await getHome();

    if (trendings) {
      res.status(200).send({ success: true, videos: trendings });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/get-series-details", async (req, res) => {
  try {
    const { slug, quality } = req.query;
    const episodes = await getSeries(slug, quality);

    if (episodes) {
      res.status(200).send({ success: true, episodes: episodes });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/get-episode-link", async (req, res) => {
  try {
    const { slug, quality, season, episode } = req.query;
    const url = await getSeriesLink(slug, quality, episode, season);
    if (url) {
      res.status(200).send({ success: true, url: url });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/movie-details", async (req, res) => {
  try {
    console.log("Okay Starting...!");
    const { slug } = req.query;
    const url = `https://uhdmovies.bet/${slug}`;

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

    // await page.setViewport({ width: 1920, height: 1000 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // await new Promise((resolve) => setTimeout(resolve, 15000));

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // await page.waitForNavigation({waitUntil: "networkidle0"});
    // console.log("Response status:", page.st);
    // await page.screenshot({ path: "uhdmovies_home.png" });

    // Get the page content as HTML
    const html = await page.content();

    // Close the browser
    await page.close();

    // res.setHeader("Content-Type", "application/json");
    // res.setHeader("Transfer-Encoding", "chunked");
    // res.status(200);

    // Load HTML into Cheerio for parsing (you can continue with your scraping logic here)
    if (html) {
      const $ = load(html);

      const description = $("p")
        .text()
        .trim()
        .replaceAll("MoviesMod Team · Powered by MoviesMod", "codewitharun");

      const links = [];

      $("a.maxbutton-1.maxbutton.maxbutton-download-g-drive").each((i, el) => {
        const href = $(el).attr("href");
        const title = $(el).attr("title");
        links.push({
          title: title,
          link: href,
        });
      });

      res.status(200).send({ success: true, video: description, links: links });
    }
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
});

async function generateLink(url) {
  try {
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

    page.on("request", (request) => {
      const blockedResources = ["doubleclick.net", "adservice.google.com"];
      if (blockedResources.some((url) => request.url().includes(url))) {
        // console.log("Blocked Ad: ", request.url());
        request.abort();
      } else {
        request.continue();
      }
    });

    await randomDelays(15000, 20000);

    // await page.screenshot({ path: "sc.png" });

    await randomDelays(1000, 3000);

    const videoAdCloseBtn = await page.$("rewardCloseButton");

    if (videoAdCloseBtn) {
      await page.click("rewardCloseButton");
      console.log("Ad close Button Clicked");
    }

    await page.waitForSelector("span a", { visible: true });
    await page.click("span a");
    console.log("First Button Clicked");

    await randomDelays(3000, 5000);

    await page.waitForSelector("span#verify_button2", { visible: true });
    await randomDelays(2000, 5000);

    await page.evaluate(() => {
      document.getElementById("verify_button2").click();
      console.log("Button 2 Clicked");
    });

    await randomDelays(10000, 12000);

    await page.waitForSelector("span#verify_button", { visible: true });

    await randomDelays(1000, 2000);

    await page.evaluate(() => {
      document.getElementById("verify_button")?.click();
      console.log("3rd Button Clicked");
    });

    await randomDelays(8000, 10000);

    await page.waitForSelector("a#two_steps_btn", { visible: true });

    await randomDelays(2000, 5000);

    // await page.click("a#two_steps_btn");

    await page.evaluate(() => {
      document.getElementById("two_steps_btn").click();
    });

    console.log("Getting the Page@ link...");

    await randomDelays(2000, 4000);

    // await page.screenshot({ path: "sc.png" });
    // await page.waitForSelector("a.btn", { visible: true });

    const html = await page.content();

    // Close the browser
    await page.close();
    // console.log(html);

    const $ = load(html);

    const link = $("a#two_steps_btn").attr("href");

    const downloadLink = await getMovieDownloadLink(link);
    if (downloadLink) {
      return downloadLink;
    }
  } catch (error) {
    console.log(error);
    throw new Error("Something Went wrong", error);
    // res.status(500).send({ success: false, error: error });
  }
}

app.get("/movie-link", async (req, res) => {
  try {
    const { url } = req.query;

    const downloadLink = await generateLink(url);
    if (downloadLink) {
      console.log(downloadLink);
      res.status(200).send({ success: true, url: downloadLink });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false });
  }
});

function randomDelays(min, max) {
  return new Promise((resolve) => {
    setTimeout(resolve, min + Math.random() * (max - min));
  });
}

app.get("/stream", async (req, res) => {
  try {
    const { url } = req.query;
    console.log(url);
    if (!url) return res.status(400).send("URL Missing");
    request
      .get(url)
      .on("response", (response) => {
        res.setHeader(
          "Content-Type",
          response.headers["content-type"] || "video/webm"
        );
        res.removeHeader("Content-Description");
        res.setHeader("Content-Disposition", "inline"); // Force inline streaming
        res.setHeader("Cache-Control", "no-store"); // Prevent caching issues
      })
      .pipe(res);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Something went wrong", error: error });
  }
});


const headers = {
  origin: 'https://web.xtratime.top',
  referer: 'https://me.webcric.com/',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  accept: '*/*'
};

app.get("/proxy/playlist.m3u8", (req, res) => {
  const fullM3U8Url = req.query.url;

  console.log("Full M3U8 URL: ", fullM3U8Url);

  if (!fullM3U8Url) {
      return res.status(400).send("Missing m3u8 URL");
  }

  // Define headers to mimic a real browser request
  const options = {
      url: fullM3U8Url,
      headers: headers,
  };

  request(options, (error, response, body) => {
      if (error) {
          console.error("Error fetching m3u8:", error);
          return res.status(500).send("Error fetching playlist");
      }

      if (response.statusCode !== 200) {
          console.error("Failed to fetch M3U8. Status:", response.statusCode);
          return res.status(response.statusCode).send("Invalid playlist response");
      }

      console.log("Fetched M3U8, modifying TS URLs...");
      console.log(response.statusCode);

      // Modify .ts file URLs to go through the proxy
      const modifiedBody = body.replace(/(media_\d+\.ts)/g, (match) => {
          return `/proxy/media?url=${encodeURIComponent(fullM3U8Url.replace("playlist.m3u8", match))}`;
      });

      // Set response headers for M3U8
      res.set({
          "Content-Type": "application/vnd.apple.mpegurl",
          "Accept-Ranges": "bytes",
      });

      res.send(modifiedBody);
  });
});

// ✅ Serve .ts segments dynamically
app.get("/proxy/media", (req, res) => {
  let fullM3U8Url = req.query.url;

  if (!fullM3U8Url) {
      return res.status(400).send("Missing m3u8 URL");
  }

  // **Fix duplicate query issue**
  if (fullM3U8Url.includes("?")) {
      let [baseUrl, queryString] = fullM3U8Url.split("?");
      let params = new URLSearchParams(queryString); // Parse query params properly

      // Reconstruct the URL without duplicate params
      fullM3U8Url = baseUrl + "?" + params.toString();
  }

  console.log("Corrected TS Segment URL:", fullM3U8Url);

  request(fullM3U8Url)
      .on("error", (error) => {
          console.error("Error fetching ts segment:", error);
          res.status(500).send("Error fetching segment");
      })
      .pipe(res);
});





async function getAuthPage() {
  const options = {
    method: "POST",
    url: "https://scrappey-com.p.rapidapi.com/api/v1",
    headers: {
      "x-rapidapi-key": "b1c26628e0msh3fbbf13ea24b4abp184561jsna2ebae86e910",
      "x-rapidapi-host": "scrappey-com.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      cmd: "request.get",
      url: "https://yupmovie.com",
    },
  };

  try {
    console.log("Getting Auth URL...");
    const { data } = await axios.request(options);
    // console.log(data?.solution?.response);
    const $ = load(data?.solution?.response);
    const url = $("a.btn").attr("href");
    const userAgent = data?.solution?.userAgent;
    const cookies = data?.solution?.cookies;
    // console.log("Auth URL: ", url);
    if (url) {
      console.log("Got Auth URL...");
      return { url: url, userAgent: userAgent, cookies: cookies };
    } else {
      throw new Error("No URL Found");
    }
  } catch (error) {
    console.error(error);
  }
}

app.get("/keep-alive", async (req, res) => {
  res.status(200).send({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
