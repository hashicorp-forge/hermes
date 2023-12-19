import { GoogleUser } from "hermes/components/inputs/people-select";

export interface HermesDocument {
  readonly objectID: string;

  status: string;
  product?: string;

  /**
   * A human-readable date string, e.g., "Aug 16, 2028".
   * Mutated in the layout by the `parse-date` helper to place
   * the date before the month.
   */
  created: string;

  /**
   * A timestamp in seconds. Used for sorting.
   */
  createdTime: number;

  /**
   * A timestamp in seconds. Used Translated by the `time-ago` helper
   * into a human-readable string, e.g., "2 days ago."
   * Not available on drafts fetched as Hits from backend.
   */
  modifiedTime?: number;

  docNumber: string;
  docType: string;
  title: string;
  locked?: boolean;
  owners?: string[];
  ownerPhotos?: string[];
  appCreated?: boolean;
  contributors?: string[];
  approvers?: string[];
  contributorObjects?: HermesUser[];
  approverObjects?: HermesUser[];
  changesRequestedBy?: string[];
  approvedBy?: string[];
  summary?: string;
  isDraft?: boolean;
  projects?: number[];
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
  name?: string;
  displayName: string;
  type: "STRING" | "PEOPLE";
  value?: string | string[];
}

export interface HermesUser {
  email: string;
  imgURL?: string | null;
}
