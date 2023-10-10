import EmberRouter from "@ember/routing/router";
import config from "hermes/config/environment";

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route("authenticated", { path: "/" }, function () {
    this.route("dashboard");
    this.route("all"); // legacy route; redirects to /documents
    this.route("documents");
    this.route("document", { path: "/document/:document_id" });
    this.route("drafts");
    this.route("my");
    this.route("results");
    this.route("settings");
    this.route("new", function () {
      this.route("doc");
    });

    if (config.environment === "development") {
      this.route("projects", function () {
        this.route("project", { path: "/:project_id" });
      });
    }
  });
  this.route("authenticate");
  this.route("404", { path: "/*path" });
});
