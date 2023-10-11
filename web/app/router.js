import EmberRouter from "@ember/routing/router";
import config from "hermes/config/environment";

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

const showProjectRoutes =
  config.environment === "development" || config.environment === "test";

Router.map(function () {
  this.route("authenticated", { path: "/" }, function () {
    this.route("dashboard");
    this.route("all"); // legacy route; redirects to /documents
    this.route("documents");
    this.route("projects");
    this.route("document", { path: "/document/:document_id" });
    this.route("project", { path: "/project/:project_id" });
    this.route("drafts");
    this.route("my", function () {
      this.route("index");
      this.route("drafts");
      this.route("published");
    });
    this.route("results");
    this.route("settings");
    this.route("new", function () {
      this.route("doc");
      if (showProjectRoutes) {
        this.route("project");
      }
    });

    if (showProjectRoutes) {
      this.route("projects", function () {
        this.route("project", { path: "/:project_id" });
      });
    }
  });
  this.route("authenticate");
  this.route("404", { path: "/*path" });
});
