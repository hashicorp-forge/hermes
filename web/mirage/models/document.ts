import { Model, hasMany } from "miragejs";

export default Model.extend({
  // Required for Mirage, even though it's empty
  relatedResources: hasMany(),
});
