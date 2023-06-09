// https://helios.hashicorp.design/components/table?tab=code#table

import { ComponentLike } from "@glint/template";
import {
  HdsTableDensity,
  HdsTableSortOrder,
  HdsTableVerticalAlignment,
} from "hds/_shared";

interface HdsTableComponentSignature {
  Element: HTMLTableElement;
  Args: {
    sortBy?: string;
    sortOrder?: HdsTableSortOrder;
    isStriped?: boolean;
    isFixedLayout?: boolean;
    density?: HdsTableDensity;
    valign?: HdsTableVerticalAlignment;
    caption?: string;
    identityKey?: string;
    sortedMessageText?: string;
    onSort?: () => void;

    // TODO: Type these
    model?: any;
    columns?: any;
  };
  Blocks: {
    // TODO: Type these
    head: any;
    body: any;
  };
}

export type HdsTableComponent = ComponentLike<HdsTableComponentSignature>;
