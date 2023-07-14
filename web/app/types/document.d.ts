import { GoogleUser } from "hermes/components/inputs/people-select";

/**
 * NOTE: This is a partial type definition.
 * We are defining it incrementally as we expand TS coverage.
 */
export interface HermesDocument {
  readonly objectID: string;

  status: string;
  product?: string;
  team?: string;
  modifiedAgo: string;
  modifiedTime: number;
  docNumber: string;
  docType: string;
  title: string;
  locked?: boolean;
  owners?: string[];
  appCreated?: boolean;
  contributors?: HermesUser[];
  approvers?: HermesUser[];
  changesRequestedBy?: string[];
  approvedBy?: string[];
  summary?: string;
  isDraft?: boolean;
  customEditableFields?: CustomEditableFields;

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
  displayName: string;
  type: "STRING" | "PEOPLE";
  value?: string;
}

export interface HermesUser {
  email: string;
  imgURL?: string | null;
}
