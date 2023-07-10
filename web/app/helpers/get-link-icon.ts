import { helper } from "@ember/component/helper";
import { assert } from "@ember/debug";

export interface GetLinkIconSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string;
}

const getLinkIconHelper = helper<GetLinkIconSignature>(([url]) => {
  if (url) {
    const urlParts = url.split("/");
    let domain = urlParts[2];

    assert("domain must exist", domain);
    const domainParts = domain.split(".");

    domain = domainParts[domainParts.length - 2];

    if (domain) {
      if (domain.includes("figma")) {
        return "figma-color";
      }
      if (domain.includes("google")) {
        return "google-color";
      }
      if (domain.includes("datadog")) {
        return "datadog-color";
      }
      if (domain.includes("github")) {
        return "github-color";
      }
      if (domain.includes("codepen")) {
        return "codepen-color";
      }
      if (domain.includes("slack")) {
        return "slack-color";
      }
      if (domain.includes("loom")) {
        return "loom-color";
      }
    }
  }
  return "file";
});

export default getLinkIconHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-link-icon": typeof getLinkIconHelper;
  }
}
