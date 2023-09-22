declare module "@hashicorp/ember-flight-icons/components/flight-icon" {
  import Component from "@glimmer/component";
  import { ComponentLike } from "@glint/template";

  // https://helios.hashicorp.design/icons/usage-guidelines?tab=code

  interface FlightIconComponentSignature {
    Element: SVGElement;
    Args: {
      name: string;
      size?: "16" | "24";
      color?: string;
      stretched?: boolean;
    };
  }

  export type FlightIconComponent = ComponentLike<FlightIconComponentSignature>;
  export default class FlightIcon extends Component<FlightIconComponentSignature> {}
}
