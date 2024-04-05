import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";
import { ProjectStatus } from "./project-status";
import { HermesDocument } from "./document";
import { AlgoliaHit } from "hermes/services/algolia";
import JiraIssueModel from "hermes/models/jira-issue";

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

export type HermesProjectHit = HermesProjectInfo & AlgoliaHit;

export interface HermesProjectResources {
  hermesDocuments?: RelatedHermesDocument[];
  externalLinks?: RelatedExternalLink[];
}

export interface HermesProject
  extends HermesProjectInfo,
    HermesProjectResources {
  jiraIssue?: JiraIssueModel;
}
