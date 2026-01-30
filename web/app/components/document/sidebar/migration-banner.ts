import Component from "@glimmer/component";

interface DocumentSidebarMigrationBannerSignature {
  Args: {};
}

export default class DocumentSidebarMigrationBanner extends Component<DocumentSidebarMigrationBannerSignature> {
  /**
   * Whether the banner should be shown.
   * PERMANENT MIGRATION BANNER - Always shown, cannot be dismissed
   */
  protected get isShown(): boolean {
    // Always return true for permanent banner
    return true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::MigrationBanner": typeof DocumentSidebarMigrationBanner;
  }
}
