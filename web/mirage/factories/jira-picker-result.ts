import { Factory } from "miragejs";

export default Factory.extend({
  id: (i) => i, // Mirage-only
  key: (i) => `KEY-00${i}`,
  url: "",
  issueTypeImage: "",
  summary: "This is a Jira picker result",
});
