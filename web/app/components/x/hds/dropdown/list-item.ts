import { action } from "@ember/object";
import Component from "@glimmer/component";

interface XHdsProductBadgeDropdownListSignature {
  Args: {
    role?: string;
    value?: any;
    selected: boolean;
    hideDropdown: () => void;
    onChange: (value: any) => void;
  };
}

export default class XHdsProductBadgeDropdownList extends Component<XHdsProductBadgeDropdownListSignature> {
  @action onClick() {
    this.args.onChange(this.args.value);
    this.args.hideDropdown();
  }
}
