import Controller from "@ember/controller";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class AuthenticatedNewController extends Controller {
  @service declare router: RouterService;

  protected objectTypes = {
    Document: {
      route: "authenticated.new.doc",
    },
    Project: {
      route: "authenticated.new.project",
      icon: "grid",
    },
  };

  constructor() {
    super(...arguments);
    this.router.on("routeDidChange", (transition: any) => {
      switch (transition.targetName) {
        case "authenticated.new.doc":
          this.selectedObjectType = "Document";
          break;
        case "authenticated.new.project":
          this.selectedObjectType = "Project";
          break;
      }
    });
  }

  @tracked selectedObjectType = "Document";

  @action submitForm() {
    return;
  }

  // @action protected changeObjectType(value: string) {
  //   const object = Object.keys(this.objectTypes).find((key) => key === value);
  //   assert("object must exist", object);
  //   this.selectedObjectType = object;
  // }
}
