import Controller from "@ember/controller";
import AuthenticatedAdminDoctypesDoctypeRoute from "hermes/routes/authenticated/admin/doctypes/doctype";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedAdminDoctypesDoctypeController extends Controller {
  queryParams = ["doctype"];
  doctype = [];

  declare model: ModelFrom<AuthenticatedAdminDoctypesDoctypeRoute>;
}
