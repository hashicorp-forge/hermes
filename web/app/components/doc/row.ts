import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface DocRowComponentSignature {
  Args: {
    avatar: string;
    createdDate: string;
    docID: string;
    docNumber: string;
    docType: string;
    owner: string;
    title: string;
    isDraft?: boolean;
    productArea: string;
    status: string;
    isResult?: boolean;
    isOwner?: boolean;
    showColorBadge?:boolean;
    dueDate?:string;
  };
}

export default class DocRowComponent extends Component<DocRowComponentSignature> {
  get productAreaName() {
    if (this.args.productArea === "Cloud Platform") {
      return "HCP";
    } else {
      return this.args.productArea;
    }
  }
  get currentDate() {
    // Get the current date
    const today = new Date();

    // Extract year, month, and day from the current date
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1
    const day = String(today.getDate()).padStart(2, '0');

    // Concatenate the parts in the desired format "yyyy-mm-dd"
    return `${year}-${month}-${day}`;
  }

  
  get isDueDateOverdue() : boolean {
    let date =this.args.dueDate||"";
    if (this.currentDate>date) {
      return true;
    }
    return false;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
