import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  objectID: (i: number) => `doc-${i}`,
  status: "Draft",
  product: "Vault",
  docType: "RFC",
  modifiedTime: 1,
  docNumber: "RFC-0000",
  title: "My Document",
});
