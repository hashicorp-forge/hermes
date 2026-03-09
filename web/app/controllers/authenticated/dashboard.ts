import Controller from "@ember/controller";
import type { HermesDocument } from "hermes/types/document";

export default class AuthenticatedDashboardController extends Controller {
  declare model: HermesDocument[];
}
