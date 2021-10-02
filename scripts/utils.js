import { createWriteStream, unlink, existsSync, mkdirSync } from "fs";
import { get } from "https";

export const download = (url, destination) =>
  new Promise((resolve, reject) => {
    const file = createWriteStream(destination);
    get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve(true));
      });
    }).on("error", (error) => {
      unlink(destination);
      reject(error.message);
    });
  });

export const createIfNotExistDir = (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`> Đã tạo thư mục ${dir}.`);
  }
};

export const S = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};
