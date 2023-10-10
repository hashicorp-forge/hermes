import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";

export interface HermesProject {
  id: string; // at least in mirage...
  name: string;
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
