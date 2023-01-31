import Component from '@glimmer/component';

export default class DocTag extends Component {
  get icon() {
    let icon;
    
    if (this.args.name == 'Boundary') {
      icon = 'boundary';
    } else if (this.args.name == 'Consul') {
      icon = 'consul';
    } else if (this.args.name == 'Cloud Platform') {
      icon = 'hcp';
    } else if (this.args.name == 'Nomad') {
      icon = 'nomad';
    } else if (this.args.name == 'Packer') {
      icon = 'packer';
    } else if (this.args.name == 'Terraform') {
      icon = 'terraform';
    } else if (this.args.name == 'Vagrant') {
      icon = 'vagrant';
    } else if (this.args.name == 'Vault') {
      icon = 'vault';
    } else if (this.args.name == 'Waypoint') {
      icon = 'waypoint';
    }
    
    return icon;
  }
  
  get foregroundColor() {
    let foregroundColor;
    
    if (this.args.name == 'Boundary') {
      foregroundColor = 'text-white';
    } else if (this.args.name == 'Consul') {
      foregroundColor = 'text-white';
    } else if (this.args.name == 'Cloud Platform') {
      foregroundColor = 'text-white';
    } else if (this.args.name == 'Nomad') {
      foregroundColor = 'text-[color:var(--token-color-nomad-foreground)]';
    } else if (this.args.name == 'Packer') {
      foregroundColor = 'text-[color:var(--token-color-packer-foreground)]';
    } else if (this.args.name == 'Terraform') {
      foregroundColor = 'text-white';
    } else if (this.args.name == 'Vagrant') {
      foregroundColor = 'text-[color:var(--token-color-vagrant-foreground)]';
    } else if (this.args.name == 'Vault') {
      foregroundColor = 'text-[color:var(--token-color-vault-foreground)]';
    } else if (this.args.name == 'Waypoint') {
      foregroundColor = 'text-[color:var(--token-color-waypoint-foreground)]';
    }
    
    return foregroundColor;
  }
  
  get gradientStartColor() {
    let gradientStartColor;
    
    if (this.args.name == 'Boundary') {
      gradientStartColor = 'from-[color:var(--token-color-boundary-gradient-primary-start)]';
    } else if (this.args.name == 'Consul') {
      gradientStartColor = 'from-[color:var(--token-color-consul-gradient-primary-start)]';
    } else if (this.args.name == 'Cloud Platform') {
      gradientStartColor = 'from-[#666]';
    } else if (this.args.name == 'Nomad') {
      gradientStartColor = 'from-[color:var(--token-color-nomad-gradient-primary-start)]';
    } else if (this.args.name == 'Packer') {
      gradientStartColor = 'from-[color:var(--token-color-packer-gradient-primary-start)]';
    } else if (this.args.name == 'Terraform') {
      gradientStartColor = 'from-[color:var(--token-color-terraform-gradient-primary-start)]';
    } else if (this.args.name == 'Vagrant') {
      gradientStartColor = 'from-[color:var(--token-color-vagrant-gradient-primary-start)]';
    } else if (this.args.name == 'Vault') {
      gradientStartColor = 'from-[color:var(--token-color-vault-gradient-primary-start)]';
    } else if (this.args.name == 'Waypoint') {
      gradientStartColor = 'from-[color:var(--token-color-waypoint-gradient-primary-start)]';
    }
    
    return gradientStartColor;
  }
  
  get gradientStopColor() {
    let gradientStopColor;
    
    if (this.args.name == 'Boundary') {
      gradientStopColor = 'to-[color:var(--token-color-boundary-gradient-primary-stop)]';
    } else if (this.args.name == 'Consul') {
      gradientStopColor = 'to-[color:var(--token-color-consul-gradient-primary-stop)]';
    } else if (this.args.name == 'Cloud Platform') {
      gradientStopColor = 'to-[#333]';
    } else if (this.args.name == 'Nomad') {
      gradientStopColor = 'to-[color:var(--token-color-nomad-gradient-primary-stop)]';
    } else if (this.args.name == 'Packer') {
      gradientStopColor = 'to-[color:var(--token-color-packer-gradient-primary-stop)]';
    } else if (this.args.name == 'Terraform') {
      gradientStopColor = 'to-[color:var(--token-color-terraform-gradient-primary-stop)]';
    } else if (this.args.name == 'Vagrant') {
      gradientStopColor = 'to-[color:var(--token-color-vagrant-gradient-primary-stop)]';
    } else if (this.args.name == 'Vault') {
      gradientStopColor = 'to-[color:var(--token-color-vault-gradient-primary-stop)]';
    } else if (this.args.name == 'Waypoint') {
      gradientStopColor = 'to-[color:var(--token-color-waypoint-gradient-primary-stop)]';
    }
    
    return gradientStopColor;
  }
}
