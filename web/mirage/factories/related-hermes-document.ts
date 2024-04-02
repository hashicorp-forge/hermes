import { Factory } from "miragejs";
import { TEST_USER_EMAIL, TEST_USER_PHOTO } from "../utils";

export default Factory.extend({
  id: (i) => `doc-${i}`,
  sortOrder: (i) => i,
  googleFileID() {
    return `${this.id}`;
  },
  title() {
    return `Related Document ${this.id}`;
  },
  documentType: "RFC",
  documentNumber() {
    return `LAB-00${this.id}`;
  },
  owners: [TEST_USER_EMAIL],
  product: "Vault",
  status: "In-Review",
  summary() {
    return `Summary for ${this.title}`;
  },

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  afterCreate(relatedHermesDocument, server) {
    const { id } = relatedHermesDocument;
    const doc = server.schema.document.find(id);

    if (!doc) {
      server.create("document", {
        id,
        objectID: id,
        title: relatedHermesDocument.title,
        docType: relatedHermesDocument.documentType,
        docNumber: relatedHermesDocument.documentNumber,
        owners: relatedHermesDocument.owners,
        product: relatedHermesDocument.product,
        status: relatedHermesDocument.status,
        _snippetResult: {
          content: {
            value: relatedHermesDocument.summary,
          },
        },
      });
    }
  },
});
