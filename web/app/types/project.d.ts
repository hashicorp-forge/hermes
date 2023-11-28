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
  status: string;
  assignee?: string;
  type: string;
  summary: string;
}

export interface BackEndHermesProject {
  id: string;
  title: string;
  status: ProjectStatus;
  description?: string;
  jiraIssueID?: string;
  creator: string;
  createdTime: number;
  modifiedTime: number;
  products?: string[];
}

export interface BackEndProjectResources {
  hermesDocuments?: RelatedHermesDocument[];
  externalLinks?: RelatedExternalLink[];
}

export interface HermesProject extends BackEndHermesProject {
  hermesDocuments?: RelatedHermesDocument[];
  jiraIssue?: JiraIssue;
  creator: string;
  externalLinks?: RelatedExternalLink[];
}
