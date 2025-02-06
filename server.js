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
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import axios from "axios";

dotenv.config();

connectToDB();

const app = express();

// Set the port to listen on (use process.env.PORT for Heroku)
const PORT = process.env.PORT || 3000;

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

app.get('/update-home',  async (req, res) => {
  try {
    console.log("Connecting to DB");
    // await connectToDatabase();
    console.log("Connected to DB");

    const { url, userAgent, cookies } = await getAuthPage();

    console.log(cookies);

    // const url = `https://yupmovie.me`;
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    await browser.setCookie(...cookies);

    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://www.google.com",
      "Accept-Language": "en-US,en;q=0.9",
    });

    console.log("URL: ", url);

    await page.goto(url, { waitUntil: "networkidle0" });
    // await page.screenshot({ path: "sc.png" });
    await page.waitForSelector("button#start-task", { visible: true });
    await randomDelays(1000, 3000);

    await page.click("button#start-task");
    console.log("First Clicked");

    await page.waitForSelector("button#random-task-0", { visible: true });

    await page.click("button#random-task-0");
    console.log("Clicked Second");

    await page.waitForSelector("button#complete-task", { visible: true });

    await page.click("button#complete-task");

    await page.evaluate(() => {
      document.getElementById("complete-task").click();
    })

    // await page.screenshot({path: 'sc.png'});
    console.log("Third Clicked");

    await randomDelays(2000, 3000);

    // await page.screenshot({path: 'sc.png'});

    await page.waitForSelector("div.alm-listing.alm-ajax", {
      visible: true,
      timeout: 60000,
    });

    const html = await page.content();
    await browser.close();

    if (html) {
      const $ = load(html);
      const trendings = [];

      const moviePromises = $("div.alm-listing.alm-ajax")
        .find("div.alm-item")
        .map(async (i, el) => {
          const title = $(el).find("h3").text().trim();
          let thumbnail = $(el)
            .find("div.alm-thumbnail-wrapper img")
            .attr("src");
          if (!thumbnail || !thumbnail.includes(".jpg")) {
            thumbnail = $(el)
              .find("div.alm-thumbnail-wrapper img")
              .attr("data-lazy-src");
          }
          const slugParts = $(el)
            .find("div.alm-content-wrapper a")
            .attr("href")
            .split("/");
          const slug = slugParts[slugParts.length - 2];
          const season = $(el)
            .find("div.alm-update-section p.alm-update-section-p")
            .text()
            .trim();

          trendings.push({ title, thumbnail, slug, season: season || null });

          // await Movie.updateOne(
          //   { slug },
          //   { $set: { title, thumbnail, season: season || null } },
          //   { upsert: true }
          // );
        })
        .get();

      await Promise.all(moviePromises);

      await Home.findOneAndUpdate(
        { type: "Home" },
        { movies: trendings },
        { new: true, upsert: true }
      );

        res.status(200).send({ success: true, message: "Home Updated", movies: trendings });
    }
    // res.status(200).send({success: true, data: html});
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).send({ success: false, error: error.message });
  }
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

cron.schedule("*/5 * * * *", async () => {
  await fetch("https://stream-scrapped.onrender.com/keep-alive")
    .then((res) => {
      console.log("Server is Alive", res);
    })
    .catch((err) => {
      console.log("Error while keeping server alive! ", err);
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
