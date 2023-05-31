import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  objectID: (i: number) => `doc-${i}`,
  status: "Draft",
  product: "Vault",
  docType: "RFC",
  modifiedTime: 1,
  docNumber: (i: number) => `RFC-00${i}`,
  title: (i: number) => `Test Document ${i}`,
  _snippetResult: {
    content: {
      value: "This is a test document",
    },
  },
  owners: ["Test user"]
});
