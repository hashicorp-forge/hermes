import type { HelperLike } from "@glint/template";

export type EmberPageTitleHelper = HelperLike<{
  Args: {
    Positional: [string];
  };
  Return: void;
}>;
