import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  name: (i: number) => `Document ${i}`,
  viewedTime: 1,
  isDraft: false,
  isLegacy: false,

  afterCreate(recentlyViewedDoc, server) {
    const doc = server.schema.document.find(recentlyViewedDoc.id);
    recentlyViewedDoc.update({ doc: doc.attrs });
  },
});
