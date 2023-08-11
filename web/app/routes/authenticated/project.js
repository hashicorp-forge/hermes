import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";

export default class AuthenticatedProjectRoute extends Route {
    @service algolia;
    @service("config") configSvc;
    @service("fetch") fetchSvc;
    @service session;
    @service authenticatedUser;
  
    async model(params) {
      const projectId = params.project_id;
      const teamId = params.team_id;
      const businessUnitId = params.business_unit_id;

      const templates = await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((r) => r.json());
      console.log(templates);
      return RSVP.hash({
        teamId: teamId,
        businessUnitId: businessUnitId,
        projectId: projectId,
        templates: templates,
      });
    }
  }