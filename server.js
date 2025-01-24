import express from "express";
import { load } from "cheerio";
import cron from "node-cron";
import DownloadLink from "./Controllers/Series/getDownloadLink.js";
import getBrowserInstance from "./Instances/browser.js";
import http from "http";
import { Server } from "socket.io";
import { getMovieDownloadLink } from "./Controllers/movies/getDownloadLink.js";
import getMovie from "./Controllers/bollywood/getMovie.js";
import getHome from "./Controllers/bollywood/getHome.js";
import getSeries from "./Controllers/bollywood/getSeries.js";
import getSeriesLink from "./Controllers/bollywood/getSeriesLink.js";

const app = express();

// Set the port to listen on (use process.env.PORT for Heroku)
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Create a new Socket.IO server
const io = new Server(server, {
  cors: {
    origin: [
      "http://192.168.142.47:8081",
      "http://192.168.142.47:3001",
      "https://stream-scrapped.onrender.com",
    ],
    methods: ["GET", "POST"],
  },
});

//sockets

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle custom events from client
  socket.on("customEvent", (data) => {
    console.log("Received data from client:", data);
    socket.emit("responseEvent", { message: "Server received your data!" });
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log("User disconnected:", socket.id, "Reason:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Connection Error:", error.message);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

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
   if(url){
    res.status(200).send({success: true, url: url});
   }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, error: error });
  }
});

app.get("/generate-link", async (req, res) => {
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
    throw new Error("Something Went wrong",  error);
    // res.status(500).send({ success: false, error: error });
  }
}

app.get("/get-movie-link", async (req, res) => {
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

// async function getDownloadLink(url) {
//   console.log("Url to visit: ", url);
//   try {
//     // const browser = await puppeteer.launch({
//     //   args: chromium.args,
//     //   executablePath: await chromium.executablePath(),
//     //   headless: chromium.args,
//     // });
//     const browser = await getBrowserInstance();
//     const page = await browser.newPage();
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
//     );
//     await page.setExtraHTTPHeaders({
//       Accept:
//         "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//       Referer: "https://tech.unbloackgames.world",
//       "Accept-Language": "en-US,en;q=0.9",
//     });

//     // await page.setViewport({ width: 1920, height: 1000 });
//     await page.goto(url, { waitUntil: "networkidle2" });
//     await page.setRequestInterception(true);

//     page.on("request", (request) => {
//       const blockedResources = ["doubleclick.net", "adservice.google.com"];
//       if (blockedResources.some((url) => request.url().includes(url))) {
//         console.log("Blocked Ad: ", request.url());
//         request.abort();
//       } else {
//         request.continue();
//       }
//     });

//     await page.waitForSelector("a.btn", {
//       visible: true,
//     });
//     // await page.screenshot({ path: "newPage.png" });

//     await page.$$eval("a.btn", (element) => {
//       console.log(element[1].getAttribute("href"));

//       element.map((el) => console.log(el.className));
//     });

//     await page.click("a.btn.btn-warning");

//     // const cookies = await browser.cookies();

//     const newHtml = await page.content();

//     await page.close();

//     const $ = load(newHtml);

//     const link = $("a.btn.btn-warning").attr("href");

//     console.log("Link: ", link);

//     if (link) {
//       const videoLink = await FinalLink(link);
//       console.log(videoLink);
//       return videoLink;
//     }
//   } catch (error) {
//     console.log(error);
//     return;
//   }
// }

// async function FinalLink(link) {
//   try {
//     const url = `https://driveleech.org${link}`;

//     // const browser = await puppeteer.launch({
//     //   args: chromium.args,
//     //   executablePath: await chromium.executablePath(),
//     //   headless: chromium.args,
//     // });

//     // await browser.setCookie(...cookies);
//     const browser = await getBrowserInstance();
//     const page = await browser.newPage();

//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
//     );
//     await page.setExtraHTTPHeaders({
//       Accept:
//         "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//       Referer: "https://www.google.com",
//       "Accept-Language": "en-US,en;q=0.9",
//     });

//     // await page.setViewport({ width: 1920, height: 1000 });
//     await page.goto(url, { waitUntil: "networkidle2" });
//     await page.setRequestInterception(true);

//     // await page.screenshot({ path: "sc2.png" });

//     page.on("request", (request) => {
//       const blockedResources = ["doubleclick.net", "adservice.google.com"];
//       console.log("Request URL : ", request.url());
//       console.log("Headers: ", request.headers());
//       if (blockedResources.some((url) => request.url().includes(url))) {
//         // console.log("Blocked Ad: ", request.url());
//         request.abort();
//       } else {
//         request.continue();
//       }
//     });

//     let videoUrl;

//     page.on("response", async (response) => {
//       const url = response.url();
//       const contentType = response.headers()["content-type"];

//       if (
//         contentType &&
//         contentType.startsWith("video" || contentType.endsWith(".mkv"))
//       ) {
//         console.log("Video URL from response:", url);
//         videoUrl = url;
//       }
//     });

//     // await page.waitForSelector('div', {visible: true});

//     // await page.evaluate(() => {
//     //   const elems = document.getElementsByName("div");
//     //   console.log(elems);
//     // });

//     await page.waitForSelector("a.btn.btn-success", { visible: true });

//     // await page.click("div#generate");

//     console.log("Clicked Initial");

//     // await page.waitForSelector("button#ins", { visible: true });

//     // await page.evaluate(() => {
//     //   document.getElementById("ins").click();
//     // });

//     // while (true) {
//     //   const isDisabled = await page.evaluate(() => {
//     //     const button = document.querySelector('button[id="ins"]');
//     //     return button ? button.getAttribute("disabled") : null;
//     //   });

//     //   if (isDisabled === "") {
//     //     // await page.screenshot({ path: "beforClick.png" });
//     //     console.log("Button is Enabled");
//     //     await randomDelays(1000, 2000);
//     //     await page.evaluate(() => {
//     //       document.getElementById("ins").click();
//     //     });
//     //     await randomDelays(3000, 5000);
//     //     break;
//     //   } else {
//     //     // await page.screenshot({ path: "beforClick.png" });

//     //     await page.evaluate(() => {
//     //       const elems = document.getElementsByName("div");
//     //       // elems;
//     //       console.log(elems);
//     //     });
//     //     await page.click("div#generate");

//     //     await randomDelays(3000, 5000);
//     //   }
//     // }

//     // await page.evaluate(() => {
//     //   const href = await window
//     // })

//     // await page.screenshot({ path: "newPage2.png" });

//     const html = await page.content();

//     await page.close();

//     const $ = load(html);

//     // console.log($("div#generate").html());

//     videoUrl = $("a.btn.btn-success").attr("href");
//     console.log("VideoLink: ", videoUrl);

//     await page.close();

//     return videoUrl;
//   } catch (error) {
//     console.log(error);
//     throw new Error("Something Went wrong",  error);
//   }
// }

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
