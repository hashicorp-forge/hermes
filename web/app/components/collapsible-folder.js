// app/components/collapsible-folder.js
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CollapsibleFolderComponent extends Component {
  @tracked isCollapsed = false;

  @action
  toggleFolder() {
    this.isCollapsed = !this.isCollapsed;
  }
}
