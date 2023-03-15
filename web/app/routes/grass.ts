import { action } from "@ember/object";
import Route from "@ember/routing/route";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";

export default class GrassRoute extends Route {
  @tracked linkedDocument: HermesDocument | null = null;

  @action noop() {
    return;
  }
}
