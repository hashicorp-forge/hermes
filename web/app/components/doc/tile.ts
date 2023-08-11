import Component from "@glimmer/component";
import parseDate from "hermes/utils/parse-date";

interface DocTileComponentSignature {
  Args: {
    avatar?: string;
    docID?: string;
    docNumber?: string;
    isOwner?: boolean;
    isResult?: boolean;
    modifiedAge?: string;
    owner?: string;
    productArea?: string;
    snippet?: string;
    status?: string;
    thumbnail?: string;
    title?: string;
    dueDate?:string;
    showColorBadge:boolean;
  };
}

export default class DocTileComponent extends Component<DocTileComponentSignature> {
  protected get productAreaName(): string | undefined {
    // console.log(this.args.docID);

    switch (this.args.productArea) {
      case "Cloud Platform":
        return "HCP";
      default:
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
  get isDueDateToday() : boolean {
    if (this.currentDate==this.args.dueDate) {
      return true;
    }
    return false;
  }
  
  
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Tile": typeof DocTileComponent;
  }
}
