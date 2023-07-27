import EmberRouter from "@ember/routing/router";
import config from "hermes/config/environment";

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route("authenticated", { path: "/" }, function () {
    this.route("all");
    this.route("dashboard");
    this.route("document", { path: "/document/:document_id" });
    this.route("drafts");
    this.route("my");
    this.route("waiting-for-me");
    this.route("docs-of-me");
    this.route("results");
    this.route("settings");
    this.route("new", function () {
      this.route("custom-template")
      this.route("doc");
    });
    this.route('myprofile');
    this.route('business-units');

    this.route('teams', {
      path: '/business-units/:business_unit_id'
    });

    this.route('projects', {
      path: '/:business_unit_id/teams/:team_id'
    });

    this.route('project', {
      path: '/business-units/:business_unit_id/teams/:team_id/projects/:project_id/project'
    });

    this.route('files', {
      path: '/business-units/:business_unit_id/teams/:team_id/projects/:project_id/files/:doctype'
    });
  });
  this.route("authenticate");
  this.route('404', { path: '/*path' })
});
