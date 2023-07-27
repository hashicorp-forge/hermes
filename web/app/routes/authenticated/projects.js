import Route from '@ember/routing/route';
import { inject as service } from "@ember/service";
import RSVP from "rsvp";

export default class AuthenticatedProjectsRoute extends Route {
  @service("fetch") fetchSvc;
  async model(params) {
    const teamId = params.team_id;
    const businessUnitId = params.business_unit_id;
  
    try {
      // Fetch the teams from the API
      const teams = await this.fetchSvc
        .fetch("/api/v1/teams")
        .then((resp) => resp?.json());
  
      // Filter the teams based on the selected teamId
      const teamProjects = teams[teamId]?.projects || [];
  
      // Return the model data using RSVP.hash
      return RSVP.hash({
        teamId: teamId,
        businessUnitId: businessUnitId,
        projects: teamProjects,
      });
    } catch (err) {
      throw err;
    }
  }
  
}