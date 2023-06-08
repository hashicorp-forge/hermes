import Component from "@glimmer/component";

interface DocRowComponentSignature {
  Args: {
    productArea: string;
  };
}

export default class DocRowComponent extends Component<DocRowComponentSignature> {
  get productAreaName() {
    let productAreaName;

    // TODO: Convert this to a switch statement

    if (this.args.productArea == "Boundary") {
      productAreaName = "Boundary";
    } else if (this.args.productArea == "Consul") {
      productAreaName = "Consul";
    } else if (this.args.productArea == "Cloud Platform") {
      productAreaName = "HCP";
    } else if (this.args.productArea == "Nomad") {
      productAreaName = "Nomad";
    } else if (this.args.productArea == "Packer") {
      productAreaName = "Packer";
    } else if (this.args.productArea == "Terraform") {
      productAreaName = "Terraform";
    } else if (this.args.productArea == "Vagrant") {
      productAreaName = "Vagrant";
    } else if (this.args.productArea == "Vault") {
      productAreaName = "Vault";
    } else if (this.args.productArea == "Waypoint") {
      productAreaName = "Waypoint";
    } else {
      productAreaName = this.args.productArea;
    }

    return productAreaName;
  }

  get productAreaIcon() {
    let productAreaIcon;

    // TODO: Convert this to a switch statement

    if (this.args.productArea == "Boundary") {
      productAreaIcon = "boundary";
    } else if (this.args.productArea == "Consul") {
      productAreaIcon = "consul";
    } else if (this.args.productArea == "Cloud Platform") {
      productAreaIcon = "hcp";
    } else if (this.args.productArea == "Nomad") {
      productAreaIcon = "nomad";
    } else if (this.args.productArea == "Packer") {
      productAreaIcon = "packer";
    } else if (this.args.productArea == "Terraform") {
      productAreaIcon = "terraform";
    } else if (this.args.productArea == "Vagrant") {
      productAreaIcon = "vagrant";
    } else if (this.args.productArea == "Vault") {
      productAreaIcon = "vault";
    } else if (this.args.productArea == "Waypoint") {
      productAreaIcon = "waypoint";
    } else {
      productAreaIcon = "folder";
    }

    return productAreaIcon;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
