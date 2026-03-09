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
    const project = server.schema.projects.find(id);

    if (project) {
      recentlyViewedProject.update({ project: project.attrs });
    } else {
      recentlyViewedProject.update({
        project: server.create("project", {
          id,
        }).attrs,
      });
    }
  },
});
