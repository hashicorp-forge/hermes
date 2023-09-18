import { GoogleUser } from "hermes/components/inputs/people-select";

export interface HermesDocument {
  readonly objectID: string;

  status: string;
  product?: string;
  modifiedTime?: number; // Not available on drafts fetched as Hits from backend
  docNumber: string;
  docType: string;
  title: string;
  locked?: boolean;
  owners?: string[];
  ownerPhotos?: string[];
  appCreated?: boolean;
  contributors?: HermesUser[];
  approvers?: HermesUser[];
  changesRequestedBy?: string[];
  approvedBy?: string[];
  summary?: string;
  isDraft?: boolean;
  customEditableFields?: CustomEditableFields;
  createdTime: number;
  thumbnail?: string;
  _snippetResult?: {
    content: {
      value: string;
    };
  };
}

export interface CustomEditableFields {
  [key: string]: CustomEditableField;
}

export interface CustomEditableField {
  name?: string;
  displayName: string;
  type: "STRING" | "PEOPLE";
  value?: string | string[];
}

export interface HermesUser {
  email: string;
  imgURL?: string | null;
}
