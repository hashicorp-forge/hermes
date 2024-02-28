import { CustomEditableField } from "./document";

export interface HermesDocumentType {
  Template: string;

  checks?: {
    label: string;
    helperText?: string;
    links?: {
      text: string;
      url: string;
    }[];
  };
  name: string;
  longName: string;
  description: string;
  flightIcon?: string;
  moreInfoLink?: {
    text: string;
    url: string;
  };
  customFields?: {
    name: string;
    readOnly: boolean;
    type: "string" | "people";
  };
}
