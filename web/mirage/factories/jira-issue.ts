import { Factory } from "miragejs";

export default Factory.extend({
  id: (i) => i,
  key: (i) => `KEY-00${i}`,
  url: "",
  priority: "Medium",
  status: "Open",
  assignee: "Unassigned",
  type: "Task",
  summary: "This is a Jira object",
});
