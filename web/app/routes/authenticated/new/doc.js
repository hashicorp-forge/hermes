import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";

export default class AuthenticatedNewDocRoute extends Route {
  @service("fetch") fetchSvc;
  @service flashMessages;
  @service router;

  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  async model(params) {
    // Validate docType.
    // template-add
    // switch (params.docType) {
    //   case "FRD":
    //   case "PRD":
    //   case "RFC":
    //   case "TECHSPEC":
    //     break;
    //   default:
    //     this.flashMessages.add({
    //       message: `Invalid document type: ${params.docType}`,
    //       title: "Invalid document type",
    //       type: "critical",
    //       timeout: 7000,
    //       extendedTimeout: 1000,
    //     });
    //     this.router.transitionTo("authenticated.new");
    // }

    //custom-template-add-task-1
    // fetch all the template names and match with current doctype.
    // if doctype does not present throw error and move to /new

    this.fetchSvc.fetch("/api/v1/document-types")
    .then((response) => response.json())
    .then((data) => {
      let check=true
      data.forEach(element => {
        if (element.templateName==params.docType) {
          check=false
        }
      });
      if(check)
      {
          this.flashMessages.add({
          message: `Invalid document type: ${params.docType}`,
          title: "Invalid document type",
          type: "critical",
          timeout: 7000,
          extendedTimeout: 1000,
        });
        this.router.transitionTo("authenticated.new");
      }
    })
    .catch((error) => {
      console.error("Error fetching document Types:", error);
      // Handle any errors that occurred during the fetch request
    });

    return RSVP.hash({
      docType: params?.docType,
    });
  }
}
