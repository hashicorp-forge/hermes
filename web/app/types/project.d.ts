import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";
import { ProjectStatus } from "./project-status";

export interface HermesProject {
  id: string; // at least in Mirage...
  title: string;
  status: ProjectStatus;
  documents?: RelatedHermesDocument[];
  description?: string;
  jiraObject?: {
    key: string;
    url: string;
    priority: string;
    status: string;
    assignee?: string;
    type?: string;
    summary: string;
  };
  relatedLinks?: RelatedExternalLink[];
  creator: string; // maybe a Google/HermesUser
  dateCreated: number;
  dateModified: number;
}
