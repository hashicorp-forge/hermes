import { Factory } from "miragejs";
import {
  TEST_JIRA_ISSUE_SUMMARY,
  TEST_JIRA_ISSUE_URL,
  TEST_JIRA_ISSUE_TYPE_IMAGE,
} from "../utils";

export default Factory.extend({
  id: (i) => i, // Mirage-only
  key: (i) => `KEY-00${i}`,
  url: TEST_JIRA_ISSUE_URL,
  issueTypeImage: TEST_JIRA_ISSUE_TYPE_IMAGE,
  summary: TEST_JIRA_ISSUE_SUMMARY,
});
