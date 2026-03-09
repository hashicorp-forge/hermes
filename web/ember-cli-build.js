"use strict";

const EmberApp = require("ember-cli/lib/broccoli/ember-app");
const PostcssCompiler = require('broccoli-postcss');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');

module.exports = function (defaults) {
  const tailwindcss = require('tailwindcss');
  const autoprefixer = require('autoprefixer');
  
  let app = new EmberApp(defaults, {
    'ember-cli-terser': {
      enabled: process.env.EMBER_ENV === 'production',
    },
    babel: {
      plugins: [
        require.resolve('ember-concurrency/async-arrow-task-transform'),
      ],
    },
    sassOptions: {
      includePaths: [
        "node_modules",
        "./node_modules/@hashicorp/design-system-tokens/dist/products/css",
      ],
      sourceMap: false,
      onlyIncluded: false,
      extension: 'scss',
      quietDeps: true,
      verbose: false,
      silenceDeprecations: ['import', 'global-builtin'],
    },
    autoImport: {
      watchDependencies: ['@ember/test-waiters'],
    },
  });

  // Get the output tree
  let tree = app.toTree();
  
  // Post-process just the CSS files with Tailwind
  let cssTree = new Funnel(tree, {
    include: ['assets/*.css'],
    destDir: '.'
  });
  
  let processedCss = new PostcssCompiler(cssTree, {
    plugins: [
      {
        module: tailwindcss,
        options: require('./tailwind.config.js')
      },
      {
        module: autoprefixer
      }
    ],
    map: false
  });
  
  // Merge processed CSS back with the rest of the tree
  let otherAssets = new Funnel(tree, {
    exclude: ['assets/*.css']
  });
  
  return mergeTrees([processedCss, otherAssets], { overwrite: true });
};
