import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.args,
  ignoreHTTPErrors: true
});
