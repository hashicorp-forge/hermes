import Component from "@glimmer/component";

interface XHdsDropdownListCheckableItemComponentSignature {
  Args: {
    selected: boolean;
    value: string;
    count?: number;
  };
}

export default class XHdsDropdownListCheckableItemComponent extends Component<XHdsDropdownListCheckableItemComponentSignature> {}
