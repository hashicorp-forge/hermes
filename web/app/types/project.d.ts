import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";
import { ProjectStatus } from "./project-status";
import { HermesDocument } from "./document";

export interface JiraIssue {
  key: string;
  url: string;
  priority: string;
  priorityImage: string;
  status: string;
  assignee?: string;
  issueType: string;
  issueTypeImage: string;
  summary: string;
}

export interface JiraPickerResult {
  key: string;
  issueTypeImage: string;
  summary: string;
  url: string;
}

export interface HermesProjectInfo {
  id: string;
  title: string;
  status: ProjectStatus;
  description?: string;
  jiraIssueID?: string; // same as JiraPickerResult.key
  creator: string;
  createdTime: number;
  modifiedTime: number;
  products?: string[];
}

export interface HermesProjectResources {
  hermesDocuments?: RelatedHermesDocument[];
  externalLinks?: RelatedExternalLink[];
}

export interface HermesProject
  extends HermesProjectInfo,
    HermesProjectResources {
  jiraIssue?: JiraIssue;
}
