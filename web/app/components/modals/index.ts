import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import ModalAlertsService from "hermes/services/modal-alerts";

export default class ModalsComponent extends Component {
  @service declare modalAlerts: ModalAlertsService;
}
