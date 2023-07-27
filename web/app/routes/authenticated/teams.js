import Route from '@ember/routing/route';
import { inject as service } from "@ember/service";
import RSVP from "rsvp";

export default class AuthenticatedTeamsRoute extends Route {
  @service("fetch") fetchSvc;
  async model(params) {
    const businessUnit = params.business_unit_id;
    try {
      // Fetch the teams from the API
      try {
        // Filter the teams based on the selected business unit
        this.teams = await this.fetchSvc
            .fetch("/api/v1/teams")
            .then((resp) => resp?.json());
        } catch (err) {
          throw err;
        }
        // Filter the teams based on the selected business unit
        const filteredTeams = {};
        let teams= this.teams;

        for (const team in teams) {
          if (Object.prototype.hasOwnProperty.call(teams, team)) {
            const teamData= teams[team];
            if (teamData && teamData.BU  === businessUnit) {
              filteredTeams[team] = teamData;
            }
          }
        }

      return RSVP.hash({
        businessUnit: businessUnit,
        teams: filteredTeams,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}