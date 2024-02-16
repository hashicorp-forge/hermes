import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  name: (i: number) => `Document ${i}`,
  viewedTime: 1,
  isDraft: false,
  isLegacy: false,

  /**
   * Associate the record with a document from the database.
   * Create one if it doesn't already exist.
   */
  afterCreate(recentlyViewedDoc, server) {
    const { id } = recentlyViewedDoc;
    const doc = server.schema.document.find(id);

    if (doc) {
      recentlyViewedDoc.update({ doc: doc.attrs });
    } else {
      recentlyViewedDoc.update({
        doc: server.create("document", {
          id,
          objectID: id,
        }).attrs,
      });
    }
  },
});
