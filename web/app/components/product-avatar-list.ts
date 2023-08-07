import { action } from "@ember/object";
import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface ProductAvatarListComponentSignature {
  Element: null;
  Args: {
    doc: HermesDocument;
    onChange: (color: string) => void;
  };
  Blocks: {
    default: [];
  };
}
// TODO: give these all stupid names
const PALETTE_RAINBOW = [
  {
    hex: "#531F6C",
    name: "Purple",
  },
  {
    hex: "#7D265A",
    name: "Raspberry",
  },
  {
    hex: "#BD303A",
    name: "Cherry",
  },
  {
    hex: "#CF502E",
    name: "Ember",
  },
  {
    hex: "#D47827",
    name: "Orange",
  },
  {
    hex: "#DBB01E",
    name: "Gold",
  },
  {
    hex: "#DFCE19",
    name: "Lemon",
  },
  {
    hex: "#79C846",
    name: "Lime",
  },
  {
    hex: "#61BB5A",
    name: "Green",
  },
  {
    hex: "#459996",
    name: "Teal",
  },
  {
    hex: "#2A72AE",
    name: "Blue",
  },
  {
    hex: "#254C9A",
    name: "Royal",
  },
  {
    hex: "#2A1468",
    name: "Midnight",
  },
];

const SLATES = [
  {
    hex: "#3D3651",
    name: "Cool 500",
  },
  {
    hex: "#5C5B75",
    name: "Cool 400",
  },
  {
    hex: "#797C95",
    name: "Cool 300",
  },
  {
    hex: "#99A2BA",
    name: "Cool 200",
  },
  {
    hex: "#BDCCE3",
    name: "Cool 100",
  },
];

const COPPERS = [
  {
    hex: "#513534",
    name: "Warm 500",
  },
  {
    hex: "#725754",
    name: "Warm 400",
  },
  {
    hex: "#947A74",
    name: "Warm 300",
  },
  {
    hex: "#B59C93",
    name: "Warm 200",
  },
  {
    hex: "#E3CABD",
    name: "Warm 100",
  },
];

export default class ProductAvatarListComponent extends Component<ProductAvatarListComponentSignature> {
  get bgColors() {
    return [...PALETTE_RAINBOW, ...SLATES, ...COPPERS];
  }

  @action protected setColor(color: string) {
    // if we don't do anything besides this,
    // just replace with parent function
    this.args.onChange(color);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductAvatarList: typeof ProductAvatarListComponent;
  }
}
