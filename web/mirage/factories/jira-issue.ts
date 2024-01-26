import { Factory } from "miragejs";
import {
  TEST_JIRA_PRIORITY,
  TEST_JIRA_PRIORITY_IMAGE,
  TEST_JIRA_ISSUE_TYPE,
  TEST_JIRA_ISSUE_TYPE_IMAGE,
  TEST_JIRA_ASSIGNEE_AVATAR,
  TEST_JIRA_ASSIGNEE,
  TEST_JIRA_ISSUE_STATUS,
  TEST_JIRA_ISSUE_URL,
  TEST_JIRA_ISSUE_SUMMARY,
} from "../mirage-utils";

export default Factory.extend({
  id: (i) => i, // mirage only
  key: (i) => `KEY-00${i}`,
  summary: TEST_JIRA_ISSUE_SUMMARY,
  url: TEST_JIRA_ISSUE_URL,
  status: TEST_JIRA_ISSUE_STATUS,
  assignee: TEST_JIRA_ASSIGNEE,
  assigneeAvatar: TEST_JIRA_ASSIGNEE_AVATAR,
  issueType: TEST_JIRA_ISSUE_TYPE,
  issueTypeImage: TEST_JIRA_ISSUE_TYPE_IMAGE,
  priority: TEST_JIRA_PRIORITY,
  priorityImage: TEST_JIRA_PRIORITY_IMAGE,
  project: "", // unused
});
