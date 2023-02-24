import Component from '@glimmer/component';

interface XHdsTabComponentSignature {
  Args: {
    action?: () => void;
    isSelected?: boolean;
    icon: string;
    iconOnly?: boolean;
    label: string;
    link?: string;
    query?: string;
  };

}

export default class XHdsTabComponent extends Component<XHdsTabComponentSignature> {
}
