import Component from "@glimmer/component";
 import { dasherize } from "@ember/string";
 import getProductId from "hermes/utils/get-product-id";

 interface DocThumbnailComponentSignature {
   Element: HTMLDivElement;
   Args: {
     isLarge?: boolean;
     status?: string;
     product?: string;
   };
 }

 export default class DocThumbnailComponent extends Component<DocThumbnailComponentSignature> {
   protected get status(): string | null {
     if (this.args.status) {
       return dasherize(this.args.status);
     } else {
       return null;
     }
   }

   protected get productShortName(): string | null {
     if (this.args.product) {
       return getProductId(this.args.product);
     } else {
       return null;
     }
   }

   protected get isApproved(): boolean {
     return this.status === "approved";
   }

   protected get isObsolete(): boolean {
     return this.status === "obsolete";
   }
 }
