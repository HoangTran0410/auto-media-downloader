import { promises } from "fs";
import puppeteer from "puppeteer";
import { download } from "./utils";

const download_user_images = async ({ urlToFetch, pageLimit }) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 500 });

  // https://stackoverflow.com/a/56515357
  const cookiesString = await promises.readFile("./cookies.json");
  const cookies = JSON.parse(cookiesString);
  await page.setCookie(...cookies);

  // download all img
  let url = urlToFetch;
  let currentPage = 1;
  let saved = 0;
  while (url && currentPage <= pageLimit) {
    console.log(`Đang tải trang ${currentPage}: ${url}...`);
    await page.goto(url);
    await page.waitForSelector("div.item");

    // get all image-src in page
    const imgsData = await page.evaluate(() => {
      // row-masonry video video-search-results / row-masonry-cell

      const imgs = Array.from(document.querySelectorAll("div.item>a>img")); // item / media
      const srcs = imgs.map((_) => _.getAttribute("data-lazy") || _.src);
      const data = srcs.map((_) => {
        const key = _.slice(_.lastIndexOf("/") + 1, _.indexOf("__"));
        const type = _.slice(_.lastIndexOf(".")); // jpg, png
        const url = `https://pixabay.com/vi/images/download/${key}.jpg`;
        return { key, type, url };
      });
      return data;
    });

    // https://pixabay.com/vi/images/download/kingfisher-6583229.jpg?attachment
    let downloadPage = await browser.newPage();
    // Prevent redirect https://stackoverflow.com/a/52214649
    await downloadPage.setRequestInterception(true);
    downloadPage.on("request", (request) => {
      if (
        request.isNavigationRequest() &&
        request.redirectChain().length !== 0
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    downloadPage.on("response", async (response) => {
      const url = response.url();
      const status = response.status();
      if (status >= 300 && status <= 399) {
        const dest = response.headers()["location"];
        // console.log("Redirect from", url, "to", dest);
        try {
          const fileName = url.slice(url.lastIndexOf("/") + 1);
          const filePath = "./downloads/" + fileName;

          await download(dest, filePath);
          console.log(`> Saved ${saved}: ${filePath}`);
          saved++;
        } catch (e) {
          console.log("! ERROR while downnload " + filePath);
        }
      }
    });
    for (let { key, type, url } of imgsData) {
      try {
        await downloadPage.goto(url);
      } catch (e) {
        // console.log(e.toString());
      }
    }
    await downloadPage.close();

    // get next page url
    url = await page.evaluate(() => {
      const nextPageBtn = document.querySelector("div.paginator>a.next");
      return nextPageBtn?.href;
    });
    currentPage++;
  }

  await browser.close();
  console.log("FINISHED");
};

export default {
  download_user_images,
};
