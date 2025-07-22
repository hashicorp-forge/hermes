import EmberRouter from "@ember/routing/router";
import config from "hermes/config/environment";
console.log("Router.js file loaded");
export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;

  constructor() {
    super(...arguments);
    console.log("Router initialized with rootURL:", this.rootURL, "and locationType:", this.location);
  }
}

Router.map(function () {
  console.log("Defining routes...");

  this.route("authenticated", { path: "/" }, function () {
    console.log("Matched authenticated route with path `/`");

    this.route("dashboard", function () {
      console.log("Matched dashboard route");
    });

    this.route("all", function () {
      console.log("Matched legacy route `/all` (redirects to /documents)");
    });

    this.route("documents", function () {
      console.log("Matched documents route");
    });

    this.route("document", { path: "/document/:document_id" }, function () {
      console.log("Matched document route with dynamic segment `:document_id`");
    });

    this.route("drafts", function () {
      console.log("Matched legacy drafts route (redirects to /my)");
    });

    this.route("my", function () {
      console.log("Matched my route");
      this.route("documents", function () {
        console.log("Matched my/documents route");
      });
    });

    this.route("results", function () {
      console.log("Matched results route");
    });

    this.route("settings", function () {
      console.log("Matched settings route");
    });

    this.route("new", function () {
      console.log("Matched new route");
      this.route("doc", function () {
        console.log("Matched new/doc route");
      });
      this.route("project", function () {
        console.log("Matched new/project route");
      });
    });

    this.route("projects", function () {
      console.log("Matched projects route");
      this.route("project", { path: "/:project_id" }, function () {
        console.log("Matched projects/project route with dynamic segment `:project_id`");
      });
    });

    this.route("product-areas", function () {
      console.log("Matched product-areas route");
      this.route("product-area", { path: "/:product_area_id" }, function () {
        console.log("Matched product-areas/product-area route with dynamic segment `:product_area_id`");
      });
    });
  });

  this.route("authenticate", function () {
    console.log("Matched authenticate route");
  });

  this.route("404", { path: "/*path" }, function () {
    console.log("Matched 404 route for unmatched paths");
  });
});
