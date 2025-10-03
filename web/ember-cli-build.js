"use strict";

const EmberApp = require("ember-cli/lib/broccoli/ember-app");

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    minifyCSS: {
      enabled: false,
    },
    postcssOptions: {
      compile: {
        extension: "scss",
        enabled: true,
        parser: require("postcss-scss"),
        cacheInclude: [/.*\.hbs$/, /.*\.scss$/],
        plugins: [
          {
            module: require("@csstools/postcss-sass"),
            options: {
              includePaths: [
                // Brings in the styles for TailwindCSS from node_modules
                // - Required so we can use @import to include the styles in SASS
                "node_modules",
                // And the styles from @hashicorp/design-system-tokens
                // - Required for @hashicorp/design-system-components to work
                "./node_modules/@hashicorp/design-system-tokens/dist/products/css",
              ],
            },
          },
          require("tailwindcss")("./tailwind.config.js"),
        ],
      },
    },
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return app.toTree();
};
