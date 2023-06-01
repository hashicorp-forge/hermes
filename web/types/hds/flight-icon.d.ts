// https://helios.hashicorp.design/icons/usage-guidelines?tab=code

import { ComponentLike } from "@glint/template";

export type FlightIconComponent = ComponentLike<{
  Element: SVGElement;
  Args: {
    name: string;
    size?: "16" | "24";
    color?: string;
    stretched?: boolean;
  };
}>;
