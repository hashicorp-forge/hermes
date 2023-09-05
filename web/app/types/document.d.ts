import { GoogleUser } from "hermes/components/inputs/people-select";

export interface HermesDocument {
  readonly objectID: string;

  status: string;
  product?: string;
  modifiedTime: number;
  created: string; // E.g., "Aug 15, 2032"
  createdTime: number;
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
  displayName: string;
  type: "STRING" | "PEOPLE";
  value?: string | string[];
}

export interface HermesUser {
  email: string;
  imgURL?: string | null;
}
