import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "./fetch";
import { assert } from "@ember/debug";

export type ProductArea = {
  abbreviation: string;
  color?: string;
};

const PALETTE_RAINBOW = [
  {
    hex: "#4F1D6A",
    name: "Grape",
  },
  {
    hex: "#531F6C",
    name: "Purple",
  },
  {
    hex: "#7A1E7A",
    name: "Violet",
  },
  {
    hex: "#7D265A",
    name: "Raspberry",
  },
  {
    hex: "#A02C5A",
    name: "Magenta",
  },
  {
    hex: "#B22C46",
    name: "Strawberry",
  },
  {
    hex: "#BD303A",
    name: "Cherry",
  },
  {
    hex: "#C93E2B",
    name: "Tangerine",
  },
  {
    hex: "#CF502E",
    name: "Ember",
  },
  {
    hex: "#D66C1E",
    name: "Pumpkin",
  },
  {
    hex: "#D47827",
    name: "Orange",
  },
  {
    hex: "#DFAF2B",
    name: "Banana",
  },
  {
    hex: "#DBB01E",
    name: "Gold",
  },
  {
    hex: "#D8C617",
    name: "Yellow",
  },
  {
    hex: "#DFCE19",
    name: "Lemon",
  },
  {
    hex: "#C9D025",
    name: "Lemon-Lime",
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
    hex: "#3FAA49",
    name: "Emerald",
  },
  {
    hex: "#3FAA49",
    name: "Jade",
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
    name: "Navy",
  },
];

const SLATES = [
  {
    hex: "#1B1A1F",
    name: "Cool 900",
  },
  {
    hex: "#1F1E23",
    name: "Cool 875",
  },
  {
    hex: "#232129",
    name: "Cool 850",
  },
  {
    hex: "#26242D",
    name: "Cool 825",
  },
  {
    hex: "#29272F",
    name: "Cool 800",
  },
  {
    hex: "#2C2A34",
    name: "Cool 775",
  },
  {
    hex: "#302E38",
    name: "Cool 750",
  },
  {
    hex: "#33313C",
    name: "Cool 725",
  },
  {
    hex: "#36343E",
    name: "Cool 700",
  },
  {
    hex: "#393742",
    name: "Cool 675",
  },
  {
    hex: "#3D3946",
    name: "Cool 650",
  },
  {
    hex: "#403C4A",
    name: "Cool 625",
  },
  {
    hex: "#2E2C38",
    name: "Cool 600",
  },
  {
    hex: "#4A4554",
    name: "Cool 575",
  },
  {
    hex: "#4D4A58",
    name: "Cool 550",
  },
  {
    hex: "#514D5C",
    name: "Cool 525",
  },
  {
    hex: "#3D3651",
    name: "Cool 500",
  },
  {
    hex: "#5A5368",
    name: "Cool 475",
  },
  {
    hex: "#5E596C",
    name: "Cool 450",
  },
  {
    hex: "#625D70",
    name: "Cool 425",
  },
  {
    hex: "#5C5B75",
    name: "Cool 400",
  },
  {
    hex: "#6F6D8B",
    name: "Cool 375",
  },
  {
    hex: "#73718F",
    name: "Cool 350",
  },
  {
    hex: "#777493",
    name: "Cool 325",
  },
  {
    hex: "#797C95",
    name: "Cool 300",
  },
  {
    hex: "#8C8FAB",
    name: "Cool 275",
  },
  {
    hex: "#9093AF",
    name: "Cool 250",
  },
  {
    hex: "#9497B3",
    name: "Cool 225",
  },
  {
    hex: "#99A2BA",
    name: "Cool 200",
  },
  {
    hex: "#A3A7BE",
    name: "Cool 175",
  },
  {
    hex: "#A7AABF",
    name: "Cool 150",
  },
  {
    hex: "#ACAFC1",
    name: "Cool 125",
  },
  {
    hex: "#BDCCE3",
    name: "Cool 100",
  },
];

const WARM_GRAYS = [
  {
    hex: "#1B1A1F",
    name: "Warm 900",
  },
  {
    hex: "#1F1E23",
    name: "Warm 875",
  },
  {
    hex: "#232129",
    name: "Warm 850",
  },
  {
    hex: "#26242D",
    name: "Warm 825",
  },
  {
    hex: "#29272F",
    name: "Warm 800",
  },
  {
    hex: "#2C2A34",
    name: "Warm 775",
  },
  {
    hex: "#302E38",
    name: "Warm 750",
  },
  {
    hex: "#33313C",
    name: "Warm 725",
  },
  {
    hex: "#36343E",
    name: "Warm 700",
  },
  {
    hex: "#393742",
    name: "Warm 675",
  },
  {
    hex: "#3D3946",
    name: "Warm 650",
  },
  {
    hex: "#403C4A",
    name: "Warm 625",
  },
  {
    hex: "#2E2C38",
    name: "Warm 600",
  },
  {
    hex: "#4A4554",
    name: "Warm 575",
  },
  {
    hex: "#4D4A58",
    name: "Warm 550",
  },
  {
    hex: "#514D5C",
    name: "Warm 525",
  },
  {
    hex: "#3D3651",
    name: "Warm 500",
  },
  {
    hex: "#5A5368",
    name: "Warm 475",
  },
  {
    hex: "#5E596C",
    name: "Warm 450",
  },
  {
    hex: "#625D70",
    name: "Warm 425",
  },
  {
    hex: "#5C5B75",
    name: "Warm 400",
  },
  {
    hex: "#6F6D8B",
    name: "Warm 375",
  },
  {
    hex: "#73718F",
    name: "Warm 350",
  },
  {
    hex: "#777493",
    name: "Warm 325",
  },
  {
    hex: "#797C95",
    name: "Warm 300",
  },
  {
    hex: "#8C8FAB",
    name: "Warm 275",
  },
  {
    hex: "#9093AF",
    name: "Warm 250",
  },
  {
    hex: "#9497B3",
    name: "Warm 225",
  },
  {
    hex: "#99A2BA",
    name: "Warm 200",
  },
  {
    hex: "#A3A7BE",
    name: "Warm 175",
  },
  {
    hex: "#A7AABF",
    name: "Warm 150",
  },
  {
    hex: "#ACAFC1",
    name: "Warm 125",
  },
  {
    hex: "#BDCCE3",
    name: "Warm 100",
  },
];

const COLORS = [...PALETTE_RAINBOW, ...SLATES, ...WARM_GRAYS];

export default class ProductAreasService extends Service {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _index: Record<string, ProductArea> | null = null;

  get index(): Record<string, ProductArea> {
    assert("_index must exist", this._index);
    return this._index;
  }

  getColor(productName?: string): string | undefined {
    if (!productName) {
      return;
    }

    const product = this.index[productName];

    if (!product) {
      return;
    }

    return product.color;
  }

  getAbbreviation(productName?: string): string | undefined {
    if (!productName) {
      return;
    }

    const product = this.index[productName];

    if (!product) {
      return;
    }

    return product.abbreviation.slice(0, 3).toUpperCase();
  }

  fetch = task(async () => {
    try {
      let initialIndex = (await this.fetchSvc
        .fetch("/api/v1/products")
        .then((resp) => resp?.json())) as Record<string, ProductArea>;

      this._index = Object.fromEntries(
        Object.entries(initialIndex).map(([key, value]) => [
          key,
          {
            ...value,
            color: COLORS[Math.floor(Math.random() * COLORS.length)]?.hex,
          },
        ]),
      );
      const randomIndex = Math.floor(Math.random() * COLORS.length);
      const randomColorHex = COLORS[randomIndex]?.hex;

      // console.log("reindex");
      // return Object.fromEntries(
      //   Object.entries(this._index).map(([key, value]) => [
      //     key,
      //     // TODO: make this real
      //     { ...value, color: randomColorHex },
      //   ]),
      // );
    } catch (err) {
      this._index = null;
      throw err;
    }
  });
}
