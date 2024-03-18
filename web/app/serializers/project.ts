import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import DS from "ember-data";
import ProjectModel from "hermes/models/project";

export default class ProjectSerializer extends JSONSerializer {
  /**
   * The serializer for the `person` model.
   * Handles `query` and `queryRecord` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: any,
    payload: { projects: ProjectModel[] } | { project: ProjectModel },
    _id: string | number,
    requestType: string,
  ) {
    // TODO: convert to switch
    console.log("payload", payload);
    console.log("requestType", requestType);
    if (requestType === "query") {
      console.log("man");
      return {};
    } else if (requestType === "findRecord" || requestType === "createRecord") {
      assert("project expected in the payload", "project" in payload);
      return {
        data: {
          id: payload.project.id,
          type: "project",
          attributes: payload.project,
        },
      };
    } else if (requestType === "findAll") {
      assert("projects expected in the payload", "projects" in payload);
      const projects = payload.projects.map((p) => {
        return {
          id: p.id,
          type: "project",
          attributes: p,
        };
      });
      return { data: projects };
    } else {
      console.log("dag nab");
      console.log();
      return {};
    }
  }
}
