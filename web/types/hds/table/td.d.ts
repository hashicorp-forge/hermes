// https://helios.hashicorp.design/components/table?tab=code#tabletd

import { ComponentLike } from "@glint/template";
import { HdsTableHorizontalAlignment } from "hds/_shared";

interface HdsTableTdComponentSignature {
  Element: HTMLTableDataCellElement;
  Args: {
    align?: HdsTableHorizontalAlignment;
  };
}

export type HdsTableTdComponent = ComponentLike<HdsTableTdComponentSignature>;
