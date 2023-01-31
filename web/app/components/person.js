import Component from "@glimmer/component";

export default class Person extends Component {
  get isHidden() {
    return this.args.ignoreUnknown && !this.args.email;
  }
}
