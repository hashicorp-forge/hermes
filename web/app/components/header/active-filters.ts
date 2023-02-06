import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import ToolbarService from "hermes/services/toolbar";

interface HeaderActiveFiltersComponentSignature {
  Args: {};
}

export default class HeaderActiveFiltersComponent extends Component<HeaderActiveFiltersComponentSignature> {
  @service declare toolbar: ToolbarService;
}
