import express from "express";
import https from "https";
import { load } from "cheerio";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import cron from "node-cron";

const app = express();

// Set the port to listen on (use process.env.PORT for Heroku)
const PORT = process.env.PORT || 3001;

// app.use(express.json());

// app.use(express.urlencoded({extended: true}));

// Define the route to stream video
app.get("/stream", (req, res) => {
  try {
    const { url } = req.query;
    console.log(url); // Remote video URL
    const range = req.headers.range;

    if (!range) {
      res.status(400).send("Range header required");
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : undefined;

    // Get video info using HEAD request to determine content length
    https
      .get(url, { method: "HEAD" }, (headRes) => {
        const fileSize = parseInt(headRes.headers["content-length"], 10);
        const chunkEnd =
          end !== undefined ? Math.min(end, fileSize - 1) : fileSize - 1;
        const chunkSize = chunkEnd - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${chunkEnd}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": headRes.headers["content-type"] || "video/mp4",
        });

        // Stream the video chunk
        https
          .get(
            url,
            { headers: { Range: `bytes=${start}-${chunkEnd}` } },
            (streamRes) => {
              streamRes.pipe(res);
              streamRes.on("error", (err) => {
                console.error("Error while streaming:", err);
                res.status(500).end("Error while streaming video");
              });
            }
          )
          .on("error", (err) => {
            console.error("Error requesting video chunk:", err);
            res.status(500).end("Error requesting video chunk");
          });
      })
      .on("error", (err) => {
        console.error("Error fetching video info:", err);
        res.status(500).send("Error fetching video info");
      });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.get("/generate-link", async (req, res) => {
  try {
    console.log("Okay Starting...!");
    const { slug } = req.query;
    const url = `https://uhdmovies.bet/${slug}`;

    // Launch Puppeteer with the chromium binary provided by chrome-aws-lambda
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.args,
    });

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
    await browser.close();

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

      // if (description) {
      //   res.write(JSON.stringify({ description: description }));
      // }

      const link = links[links.length - 1].link;

      if (link) {
        const videoLink = await generateLink(link);

        if (videoLink) {
          // res.write(JSON.stringify({ link: videoLink }));
          // res.end();
          res.status(200).send({
            success: true,
            description: description,
            link: videoLink,
          });
        }
      }
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
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.args,
    });

    // const [newPagePromise] = [
    //   new Promise((resolve) =>
    //     browser.once("targetcreated", (target) => resolve(target.page()))
    //   ),
    // ];

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

    // Close the browser
    await browser.close();
    // console.log(html);

    const $ = load(html);

    const link = $("a#two_steps_btn").attr("href");

    const downloadLink = await getDownloadLink(link);
    if (downloadLink) {
      return downloadLink;
    }
  } catch (error) {
    console.log(error);
    // res.status(500).send({ success: false, error: error });
  }
}

function randomDelays(min, max) {
  return new Promise((resolve) => {
    setTimeout(resolve, min + Math.random() * (max - min));
  });
}

async function getDownloadLink(url) {
  console.log("Url to visit: ", url);
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.args,
    });

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

    // await page.screenshot({ path: "newPage.png" });

    await page.waitForSelector("a.btn", { visible: true });

    await page.click("a.btn");

    // const cookies = await browser.cookies();

    const newHtml = await page.content();

    const $ = load(newHtml);

    const link = $("a.btn").attr("href");

    if (link) {
      const videoLink = await FinalLink(link);
      console.log(videoLink);
      return videoLink;
    }
  } catch (error) {
    console.log(error);
  }
}

async function FinalLink(url) {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.args,
    });

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

    // await page.waitForSelector('div', {visible: true});

    await page.evaluate(() => {
      const elems = document.getElementsByName("div");
      console.log(elems);
    });

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

    // const $ = load(html);

    // console.log($("div#generate").html());

    await page.close();

    return videoUrl;
  } catch (error) {
    console.log(error);
  }
}

app.get("/keep-alive", async (req, res) => {
  res.status(200).send({ success: true });
});

cron.schedule("* * * * *", () => {
  try {
    console.log("Server Is Alive");
  } catch (error) {
    console.log(error);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
