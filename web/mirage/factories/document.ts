import { Factory } from "miragejs";
import { TEST_USER_EMAIL } from "../utils";

export function getTestDocNumber(product: string) {
  let abbreviation = "";

  switch (product) {
    case "Test Product 0":
      abbreviation = "TP0";
      break;
    case "Test Product 1":
      abbreviation = "TP1";
      break;
    case "Test Product 2":
      abbreviation = "TP2";
      break;
    default:
      abbreviation = "HCP";
      break;
  }
  return `${abbreviation}-001`;
}

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  objectID: (i: number) => `doc-${i}`,
  title: (i: number) => `Test Document ${i}`,
  status: "WIP",
  product: "Vault",
  docType: "RFC",
  modifiedTime: 1,
  createdTime: 1,
  appCreated: true,
  isShareable: false,
  isDraft: true,
  docNumber() {
    // @ts-ignore - Mirage types are wrong
    // See discussion at https://github.com/miragejs/miragejs/pull/525
    return getTestDocNumber(this.product);
  },
  _snippetResult: {
    content: {
      value: "This is a test document",
    },
  },
  projects: [],
  approvers: [],
  owners: [TEST_USER_EMAIL],
});
