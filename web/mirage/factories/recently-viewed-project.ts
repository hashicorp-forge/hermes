import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => i,
  viewedTime: 1,

  afterCreate(recentlyViewedProject, server) {
    const project = server.schema.projects.find(recentlyViewedProject.id);
    recentlyViewedProject.update({ project: project.attrs });
  },
});
