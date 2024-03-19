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
    payload: { projects: ProjectModel[] } | ProjectModel,
    _id: string | number,
    requestType: string,
  ) {
    switch (requestType) {
      case "findRecord":
      case "createRecord":
        assert("id expected in the payload", "id" in payload);
        return {
          data: {
            id: payload.id,
            type: "project",
            attributes: payload,
          },
        };
      case "findAll":
        assert("projects expected in the payload", "projects" in payload);
        const projects = payload.projects.map((p) => {
          return {
            id: p.id,
            type: "project",
            attributes: p,
          };
        });
        return { data: projects };
      case "updateRecord":
        assert("id expected in the payload", "id" in payload);
        return {
          data: {
            id: payload.id,
            type: "project",
            attributes: payload,
          },
        };
      default:
        console.log("unhandled case", {
          requestType,
          payload,
        });
        return {};
    }
  }
}
