import { RelatedResourcesResponse } from './relatedResources';

export default interface IDocumentMetadata {
  contributors?: string[];
  approvers?: string[];
  approverGroups?: string[];
  created: string;            // e.g. "Sep 15, 2025"
  createdTime: number;        // epoch timestamp (seconds)
  customEditableFields: {
    [key: string]: {
      displayName: string;
      type: "STRING" | "PEOPLE" | string; // can extend if more types exist
      values?: string[]
    };
  };
  docNumber: string;
  docType: string;
  modifiedTime: number;       // epoch timestamp (seconds)
  objectID: string;
  owners: string[];
  product: string;
  status: string;
  summary: string;
  title: string;
  projects?: number[]  // Array of project IDs
  projectDetails?: Array<{id: string, title: string}> // Project details for display
  baseUrl?: string // Base URL for creating hyperlinks
  stakeholders?: string;
  _isDraft: boolean;
  archived?: boolean;
  relatedResources?: RelatedResourcesResponse;

  customFields: {
    name: string,
    displayName: string,
    type: string,
    value: string| string[]
  }[]
  approvedBy?: string[];
}


export class DocumentMetadata {
  approvers?: string[];
  approverGroups?: string[];
  created: string;
  contributors?: string[];
  createdTime: number;
  docNumber: string;
  docType: string;
  modifiedTime: number;
  objectID: string;
  owners: string[];
  product: string;
  status: string;
  summary: string;
  title: string;

  customFields: Map<string, string> = new Map();


  constructor(data: Record<string, any> & IDocumentMetadata) {
  this.approvers = data.approvers;
  this.approverGroups = data.approverGroups;
    this.created = data.created;
    this.createdTime = data.createdTime;
    this.docNumber = data.docNumber;
    this.docType = data.docType;
    this.modifiedTime = data.modifiedTime;
    this.objectID = data.objectID;
    this.owners = data.owners;
  }
  
}