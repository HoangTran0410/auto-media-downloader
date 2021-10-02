import { createInterface } from "readline";
import { VIDEO_QUALITY } from "./constants.js";
import { download_search_img } from "./download_search_img.js";
import { download_search_video } from "./download_search_video.js";
import { S } from "./utils.js";

// https://stackoverflow.com/a/68504470
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const prompt = (query) =>
  new Promise((resolve) => rl.question(S.FgGreen + query + S.Reset, resolve));

const wait_for_key_pressed = async () =>
  await prompt("..Nhấn phím bất kỳ để tiếp tục..");

const choose = async (title, menu_items) => {
  let title_ui = `======== ${title} ========`;
  let ui = "";
  ui += "\n" + new Array(title_ui.length).fill("=").join("") + "\n";
  ui += title_ui + "\n";
  ui += new Array(title_ui.length).fill("=").join("");
  Object.entries(menu_items).map(([key, value], index) => {
    ui += `\n${key}: ${value}`;
  });
  console.log(ui);

  while (true) {
    const input = await prompt("\n> Chon chuc nang: ");
    if (input in menu_items) {
      return {
        key: input,
        value: menu_items[input],
      };
    } else {
      console.log("[!] Khong hop le. Vui long chon lai.");
    }
  }
};

// ========================================== MENU =========================================
export const menu = async () => {
  while (true) {
    const action = await choose("Pixabay Downloader", {
      1: "Tải Ảnh",
      2: "Tải Video",
      3: "Thoát",
    });

    if (action.key == 3) break;

    const url = await prompt("> Nhập đường dẫn URL (Nhập -1 để quay lại): ");
    if (url != -1) {
      const pageLimit = await prompt("> Tải bao nhiêu trang: ");
      const folderToSave = await prompt(
        "> Lưu vào thư mục nào (Chỉ cần ghi tên thư mục): "
      );

      if (action.key == 1) {
        await download_search_img({
          urlToFetch: url,
          pageLimit: pageLimit,
          downloadDestination: "./downloads/images/" + folderToSave + "/",
        });
      }

      if (action.key == 2) {
        const quality = await prompt(
          "> Chọn chất lượng video (0-Gốc, 1-Vừa, 2-Nhỏ, 3-Nhỏ nhất): "
        );
        const ignoreLicense = await prompt(
          "> Có tải video bản quyền không (0-Không, 1-Có): "
        );
        const qualities = [
          VIDEO_QUALITY.SOURCE,
          VIDEO_QUALITY.MEDIUM,
          VIDEO_QUALITY.SMALL,
          VIDEO_QUALITY.TINY,
        ];
        await download_search_video({
          urlToFetch: url,
          pageLimit: pageLimit,
          checkLicense: ignoreLicense == 1 ? false : true,
          downloadDestination: "./downloads/videos/" + folderToSave + "/",
          quality: qualities[quality],
        });
      }
    }
  }

  rl.close();
};
rl.on("close", () => process.exit(0));
