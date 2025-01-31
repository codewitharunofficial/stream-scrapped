import axios from "axios";

export default async function scrapeHomeandSaveCookies() {
  try {
    const options = {
      method: "POST",
      url: process.env.HOST_URL,
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": "scrappey-com.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      data: {
        cmd: "request.get",
        url: process.env.SCRAPE_URL,
      },
    };

    const {data} = await axios.get(options);
    console.log(data);
  } catch (error) {
    console.log(error);
  }
}
