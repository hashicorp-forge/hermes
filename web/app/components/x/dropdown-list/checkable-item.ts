import Component from "@glimmer/component";

interface XDropdownListCheckableItemComponentSignature {
  Args: {
    selected: boolean;
    value: string;
    count?: number;
  };
}

export default class XDropdownListCheckableItemComponent extends Component<XDropdownListCheckableItemComponentSignature> {}
