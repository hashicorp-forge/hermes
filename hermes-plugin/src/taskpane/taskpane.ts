/* global Word console */

export async function insertText(text: string) {
  console.log("Inserting text: " + text);
  // Write text to the document.
  try {
    await Word.run(async (context) => {
      let body = context.document.body;
      //body.insertParagraph(text, Word.InsertLocation.end);
      await context.sync();
    });
  } catch (error) {
    console.log("Error: " + error);
  }
}



// export async function getWordDocProperty() {
//   try {
//     await Word.run(async (ctx) => {
//       const documentProperties = ctx.document.properties.load();
//       await ctx.sync();
    
//       console.log(">>>>> keywords",documentProperties.toJSON());
//     });
//   } catch (error) {
//     console.error(error);
    
//   }
// }

const headers = ["Summary", "Created", "Status", "Owner", "Product", "Owner", "Approvers", "Contributors", "Name", ""];
const sts = "Approved"

export async function getHeaders() {
  try {
    await Word.run(async (context) => {
      await context.sync();
      const tables = context.document.body.tables;
      
      const items = tables.load();
     // await items.context.sync();
      await context.sync();
      const headerTable = items.getFirst().load();
    //  await headerTable.context.sync();
      const rows = headerTable.rows.load();
      await context.sync();
      console.log("Rows loaded", rows.items);
      const rowItems = rows.items;

      for (const rowI of rowItems) {
        const cells = rowI.cells;
        cells.load();
        await context.sync();

        const cellItems = cells.items
        console.log("COL:", cellItems);
        for (const col of cellItems) {
          const body = col.body
          body.load();
          await context.sync();
          const cellText = body.text;
          const [header, value] = cellText.split(":");
          
          if (header === "Status") {
            console.log("Found Status:" );
            body.font.bold = false;

            body.insertText(`Status: ${value}`, "Replace");

            const foundItems = body.search(sts, {matchCase: true});
            foundItems.load();
            await context.sync();
            //console.log("Found items:", foundItems.items[0].text);

            if (foundItems.items.length !== 0) {
              foundItems.items[0].font.bold = true;
              console.log("Found and made bold");
            }
            // body.insertText("Status: In Progress", Word.InsertLocation.replace);
            await context.sync();
          }
        }
      }
      
    });
  } catch (error) {
    console.log(error.stack);
  }
}