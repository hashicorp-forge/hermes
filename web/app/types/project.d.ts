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
  description?: string;
  jiraIssueID?: string;
  creator: string;
  createdDate: number;
  modifiedTime: number;
  hermesDocuments?: RelatedHermesDocument[];
  externalLinks?: RelatedExternalLink[];
  jiraIssue?: JiraIssue;
}
