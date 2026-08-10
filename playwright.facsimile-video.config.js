const baseConfig = require("./playwright.config.js");

module.exports = {
  ...baseConfig,
  use: {
    ...(baseConfig.use || {}),
    video: "on",
  },
};
