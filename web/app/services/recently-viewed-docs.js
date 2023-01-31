import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { task } from "ember-concurrency";

export default class RecentlyViewedDocsService extends Service {
  @service("fetch") fetchSvc;
  @service session;

  recentlyViewedDocsFilename = "recently_viewed_docs.json";

  // get returns an array of recently viewed docs.
  @task({ restartable: true }) *get() {
    const recentlyViewedDocsFileID =
      yield this._getRecentlyViewedDocsFileID.perform();

    if (recentlyViewedDocsFileID) {
      // Download file contents.
      const recentlyViewedDocs = yield this.fetchSvc
        .fetch(
          `https://www.googleapis.com/drive/v3/files/${recentlyViewedDocsFileID}?` +
            new URLSearchParams({
              alt: "media",
              fields: "files(id, name)",
            }),
          {
            headers: {
              Authorization:
                "Bearer " + this.session.data.authenticated.access_token,
              "Content-Type": "application/json",
            },
          }
        )
        .then((resp) => resp.json())
        .catch((err) => {
          console.log(`Error getting recently viewed docs file: ${err}`);
          throw err;
        });

      return recentlyViewedDocs;
    }

    // Return empty array if file didn't exist.
    return [];
  }

  // _getRecentlyViewedDocsFileID returns the Google Drive file ID of the
  // recently viewed docs file.
  @task({ restartable: true }) *_getRecentlyViewedDocsFileID() {
    // List app data files.
    const appDataFiles = yield this.fetchSvc
      .fetch(
        "https://www.googleapis.com/drive/v3/files?" +
          new URLSearchParams({
            fields: "files(id, name)",
            spaces: "appDataFolder",
          }),
        {
          headers: {
            Authorization:
              "Bearer " + this.session.data.authenticated.access_token,
            "Content-Type": "application/json",
          },
        }
      )
      .then((resp) => resp.json())
      .catch((err) => {
        console.log(`Error listing app data files: ${err}`);
        throw err;
      });

    const file = appDataFiles?.files?.find(
      (o) => o.name === this.recentlyViewedDocsFilename
    );
    return file?.id;
  }

  // Add adds a recently viewed doc.
  @task({ restartable: true }) *addDoc(docID) {
    if (!docID) {
      throw new Error("docID is required");
    }

    // Get recently viewed docs array.
    let recentlyViewedDocs = yield this.get.perform();

    // Filter docID from array.
    recentlyViewedDocs = recentlyViewedDocs.filter((e) => e !== docID);

    // Add docID to beginning of array.
    recentlyViewedDocs.unshift(docID);

    const recentlyViewedDocsFileID =
      yield this._getRecentlyViewedDocsFileID.perform();

    const body =
      "--PART_BOUNDARY\nContent-Type: application/json; charset=UTF-8\n\n" +
      JSON.stringify({
        name: this.recentlyViewedDocsFilename,
        parents: ["appDataFolder"],
      }) +
      "\n--PART_BOUNDARY\nContent-Type: application/json\n\n" +
      JSON.stringify(recentlyViewedDocs) +
      "\n--PART_BOUNDARY--";

    if (recentlyViewedDocsFileID) {
      // The file exists, so update it.
      yield this.fetchSvc
        .fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${recentlyViewedDocsFileID}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                "Bearer " + this.session.data.authenticated.access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(recentlyViewedDocs),
          }
        )
        .then((resp) => resp.json())
        .catch((err) => {
          console.log(`Error saving recently viewed docs: ${err}`);
          throw err;
        });
    } else {
      // The file doesn't exist, so create it.
      yield this.fetchSvc
        .fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: {
              Authorization:
                "Bearer " + this.session.data.authenticated.access_token,
              "Content-Type": "multipart/related; boundary=PART_BOUNDARY",
            },
            body: body,
          }
        )
        .then((resp) => resp.json())
        .catch((err) => {
          console.log(`Error saving recently viewed docs: ${err}`);
          throw err;
        });
    }
  }
}
