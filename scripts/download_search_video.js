import { promises as _promises } from "fs";
import puppeteer from "puppeteer";
import { VIDEO_QUALITY } from "./constants.js";
import { createIfNotExistDir, download, S } from "./utils.js";

export const download_search_video = async ({
  urlToFetch,
  pageLimit,
  checkLicense = false,
  downloadDestination = "./downloads/",
  quality = VIDEO_QUALITY.SOURCE,
}) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 500 });

  // https://stackoverflow.com/a/56515357
  const cookiesString = await _promises.readFile("./cookies.json");
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
    const video_data = await page.evaluate(
      (vars) => {
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

        // Get all videos
        let video_items = Array.from(
          document.querySelectorAll(".video-search-results div.item")
        );
        // check video license
        if (vars.checkLicense) {
          video_items = video_items.filter((_) => {
            const meta_license = _.querySelector("meta[itemprop='license']");
            if (meta_license) {
              const license_content = meta_license.getAttribute("content");
              const is_public = license_content?.indexOf("public") >= 0;
              return is_public;
            }
            return true;
          });
        }

        data.push(
          ...video_items.map((_) => {
            const href = _.querySelector("a").href;
            const key = href.slice(href.lastIndexOf("-") + 1, href.length - 1);
            const url = `https://pixabay.com/vi/videos/download/video-${key}_${quality}.mp4`; //_.querySelector("div.media").getAttribute("data-mp4");
            const type = "mp4";
            return { key, type, url };
          })
        );

        return data;
      },
      { checkLicense }
    );

    console.log(`> Tìm thấy ${video_data.length} video. Đang xử lý...`);

    //  Get all video link in current page
    const allLinks = [];
    let downloadPage = await browser.newPage();
    // Prevent redirect https://stackoverflow.com/a/52214649
    await downloadPage.setRequestInterception(true);
    downloadPage.on("request", (request) => {
      // video redirect 2 lần
      if (request.isNavigationRequest() && request.redirectChain().length > 1) {
        request.abort();
      } else {
        request.continue();
      }
    });
    downloadPage.on("response", (response) => {
      // video redirect 2 lần
      if (response.request().redirectChain().length <= 1) return;

      const url = response.url();
      const status = response.status();
      if (status >= 300 && status <= 399) {
        const destUrl = response.headers()["location"];
        // console.log("Redirect from", url, "to", dest);
        try {
          createIfNotExistDir(downloadDestination);
          const fileName = /(?<=filename=)(.*?)(?=\&source)/
            .exec(destUrl)[0]
            .replace(/\+/g, "")
            .replace(/\.vid/g, ".mp4");
          const filePath = downloadDestination + fileName;

          allLinks.push({
            url: destUrl,
            pathToSave: filePath,
          });
        } catch (e) {
          console.log(
            S.FgRed + `[!] Không tìm được link tải của ${url}` + S.Reset
          );
        }
      }
    });

    for (let i = 0; i < video_data.length; i++) {
      const { key, type, url } = video_data[i];
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
        console.log(`> Đang tải video ${i}: ${pathToSave}`);
        await download(url, pathToSave);
      } catch (e) {
        console.log(
          S.BgRed + `[!] LỖI khi tải video ${pathToSave}` + S.Reset,
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
