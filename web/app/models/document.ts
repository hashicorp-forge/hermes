import Model, { attr } from "@ember-data/model";
import { CustomEditableFields } from "hermes/types/document";

export default class DocumentModel extends Model {
  @attr declare _snippetResult?: {
    content: {
      value: string;
    };
  };
  @attr declare appCreated: boolean;
  @attr declare approvers?: string[];
  @attr declare contributors?: string[];
  @attr declare created: string;
  @attr declare createdTime: number;
  @attr declare customEditableFields: CustomEditableFields;
  @attr declare docNumber: string;
  @attr declare docType: string;
  @attr declare isDraft?: boolean;
  @attr declare locked?: boolean;
  @attr declare modifiedTime?: number;
  @attr declare objectID: string;
  @attr declare owners: string[];
  @attr declare product: string;
  @attr declare projects: number[];
  @attr declare title: string;
  @attr declare status: string;
}
