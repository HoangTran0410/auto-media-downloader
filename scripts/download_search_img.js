import { promises } from "fs";
import puppeteer from "puppeteer";
import { download, createIfNotExistDir, S } from "./utils.js";

export const download_search_img = async ({
  urlToFetch,
  pageLimit,
  downloadDestination = "./downloads/",
}) => {
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
  while (url && currentPage <= pageLimit) {
    console.log(S.FgBlue + `\nĐang tải trang ${currentPage}: ${url}` + S.Reset);
    await page.goto(url);
    await page.waitForSelector("div.item");

    // Get all media in page
    const img_data = await page.evaluate(() => {
      const data = [];

      // Get all imgs/vectors/illutrations
      const img_items = Array.from(
        document.querySelectorAll(".search-results div.item")
      );
      const img_srcs = img_items.map((_) =>
        _.querySelector("meta[itemprop='contentUrl']").getAttribute("content")
      );
      data.push(
        ...img_srcs.map((_) => {
          const key = _.slice(_.lastIndexOf("/") + 1, _.indexOf("__"));
          const type = _.slice(_.lastIndexOf(".")); // jpg, png
          const url = `https://pixabay.com/vi/images/download/${key}.jpg`;
          return { key, type, url };
        })
      );

      return data;
    });

    console.log(`> Tìm thấy ${img_data.length} hình ảnh. Đang xử lý...`);

    //  Begin download
    const allLinks = [];
    let downloadPage = await browser.newPage();
    // Prevent redirect https://stackoverflow.com/a/52214649
    await downloadPage.setRequestInterception(true);
    downloadPage.on("request", (request) => {
      if (request.isNavigationRequest() && request.redirectChain().length > 0) {
        request.abort();
      } else {
        request.continue();
      }
    });
    downloadPage.on("response", (response) => {
      const url = response.url();
      const status = response.status();
      if (status >= 300 && status <= 399) {
        const destUrl = response.headers()["location"];
        try {
          createIfNotExistDir(downloadDestination);
          const fileName = url.slice(url.lastIndexOf("/") + 1);
          const filePath = downloadDestination + fileName;

          allLinks.push({
            url: destUrl,
            pathToSave: filePath,
          });
        } catch (e) {
          console.log(
            S.FgRed +
              `[!] Không tìm được link tải của ${url}\nLỗi ${e.toString()}` +
              S.Reset
          );
        }
      }
    });

    for (let i = 0; i < img_data.length; i++) {
      const { key, type, url } = img_data[i];
      try {
        console.log(`> Đang xử lý ${i}: ${url}`);
        await downloadPage.goto(url);
      } catch (e) {}
    }
    await downloadPage.close();
    console.log(S.FgGreen + "> XỬ LÝ XONG. ĐANG BẮT ĐẦU TẢI..." + S.Reset);

    // Download all links
    for (let i = 0; i < allLinks.length; i++) {
      const { url, pathToSave } = allLinks[i];
      try {
        console.log(`> Đang tải hình ảnh ${i}: ${pathToSave}`);
        await download(url, pathToSave);
      } catch (e) {
        console.log(
          S.BgRed + `[!] LỖI khi tải hình ảnh ${pathToSave}` + S.Reset,
          e.toString()
        );
      }
    }

    // Move to next page
    url = await page.evaluate(() => {
      const pagiBtns = Array.from(
        document.querySelectorAll("div.paginator>a.pure-button")
      );
      const nextPageBtn = pagiBtns[pagiBtns.length - 1];
      return nextPageBtn?.href;
    });
    currentPage++;
  }

  await browser.close();
  console.log(S.FgYellow + "> TẢI XONG." + S.Reset);
};
