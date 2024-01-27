import Inflector from "ember-inflector";

export function initialize() {
  const inflector = Inflector.inflector;

  // Turn off pluralization.
  inflector.uncountable("document");
  inflector.uncountable("me");
}

export default {
  name: "custom-inflector-rules",
  initialize,
};
