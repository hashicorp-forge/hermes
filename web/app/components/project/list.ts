import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject } from "hermes/routes/authenticated/projects";
import Masonry from "masonry-layout";

interface ProjectListComponentSignature {
  Args: {
    projects: HermesProject[];
  };
}

export default class ProjectListComponent extends Component<ProjectListComponentSignature> {
  @tracked private container: HTMLElement | null = null;
  // we may want some "sortedProjects" computed property here
  @action protected configureMasonry(element: HTMLElement): void {
    this.container = element;
    const masonry = new Masonry(this.container, {
      itemSelector: ".project-tile",
      columnWidth: ".project-tile",
      percentPosition: true,
      gutter: 10,
      transitionDuration: 0,
    });

    masonry.layout;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::List": typeof ProjectListComponent;
  }
}
