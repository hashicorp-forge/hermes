import Inflector from "ember-inflector";

export function initialize() {
  const inflector = Inflector.inflector;

  // Don't pluralize the document route when using a dynamic segment.
  inflector.uncountable("document");
}

export default {
  name: "custom-inflector-rules",
  initialize,
};
