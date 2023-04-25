import Component from "@glimmer/component";

interface InputsSelectDropdownListComponentSignature {
  Args: {
    items: any;
    selected?: any;
    listIsOrdered?: boolean;
    isSaving?: boolean;
    onItemClick: () => void;
  };
}

export default class InputsSelectDropdownListComponent extends Component<InputsSelectDropdownListComponentSignature> {}
