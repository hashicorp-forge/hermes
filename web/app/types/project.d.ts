import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";
import { ProjectStatus } from "./project-status";

export interface JiraIssue {
  key: string;
  url: string;
  priority: string;
  status: string;
  assignee?: string;
  type: string;
  summary: string;
}

export interface HermesProject {
  id: string;
  title: string;
  status: ProjectStatus;
  hermesDocuments?: RelatedHermesDocument[];
  description?: string;
  jiraIssueID?: string;
  jiraIssue?: JiraIssue;
  creator: string;
  createdTime: number;
  modifiedTime: number;
  externalLinks?: RelatedExternalLink[];
}
