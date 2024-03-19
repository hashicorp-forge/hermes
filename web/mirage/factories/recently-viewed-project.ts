import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => i,
  viewedTime: 1,

  /**
   * Associate the record with a project from the database.
   * Create one if it doesn't already exist.
   */
  afterCreate(recentlyViewedProject, server) {
    const { id } = recentlyViewedProject;
    let project = server.schema.projects.find(id);

    if (!project) {
      project = server.create("project", {
        id,
      });
    }

    recentlyViewedProject.update({
      project: project.attrs,
    });
  },
});
