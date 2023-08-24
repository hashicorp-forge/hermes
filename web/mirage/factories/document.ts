import { Factory } from "miragejs";

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
  objectID: (i: number) => `doc-${i}`,
  title: (i: number) => `Test Document ${i}`,
  status: "Draft",
  product: "Vault",
  docType: "RFC",
  modifiedAgo: 1000000000,
  modifiedTime: 1,
  createdTime: 1,
  appCreated: true,
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
  approvers: [],
  owners: ["testuser@example.com"],
});
