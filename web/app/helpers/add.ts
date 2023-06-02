import { helper } from "@ember/component/helper";

interface AddHelperSignature {
  Args: {
    Positional: [first: string | number, second: string | number];
  };
  Return: number;
}

const addHelper = helper<AddHelperSignature>(
  ([first, second]: [string | number, string | number]) => {
    let firstInteger = 0;
    let secondInteger = 0;

    if (typeof first === "number") {
      firstInteger = first;
    } else {
      firstInteger = parseInt(first);
    }

    if (typeof second === "number") {
      secondInteger = second;
    } else {
      secondInteger = parseInt(second);
    }
    return firstInteger + secondInteger;
  }
);

export default addHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    add: typeof addHelper;
  }
}
