import { Factory } from "miragejs";

export function getTestProductAbbreviation(product: string) {
  switch (product) {
    case "Test Product 0":
      return "TST-0";
    case "Test Product 1":
      return "TST-1";
    case "Test Product 2":
      return "TST-2";
  }
}

export default Factory.extend({
  objectID: (i: number) => `doc-${i}`,
  title: "My Document",
  status: "Draft",
  product: "Vault",
  docType: "RFC",
  modifiedAgo: 1000000000,
  modifiedTime: 1,
  docNumber() {
    return getTestProductAbbreviation(this.product);
  },
});
