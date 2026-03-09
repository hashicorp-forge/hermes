import type { HelperLike } from "@glint/template";

export type EmberSetBodyClassHelper = HelperLike<{
  Args: {
    Positional: [string];
  };
  Return: void;
}>;
