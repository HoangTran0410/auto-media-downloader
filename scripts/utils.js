const fs = require("fs");
const https = require("https");

module.exports = {
  download: (url, destination) =>
    new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      https
        .get(url, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close(resolve(true));
          });
        })
        .on("error", (error) => {
          fs.unlink(destination);
          reject(error.message);
        });
    }),
};
