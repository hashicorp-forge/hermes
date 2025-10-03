module.exports = {
  presets: [
    '@babel/preset-env'
  ],
  plugins: [
    // Add support for JavaScript private methods used by Ember Data 5.7.0
    '@babel/plugin-proposal-private-methods',
    // Support for private fields as well
    '@babel/plugin-proposal-private-property-in-object',
    '@babel/plugin-proposal-class-properties'
  ],
};