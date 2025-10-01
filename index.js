const fs = require("fs");
const AnkiExport = require("anki-apkg-export").default;
const config = require("./config.json");

async function createDeck(dataJson, deckName, batchSize = 50) {
  if (!dataJson && !deckName) {
    return console.log(
      `You must store a json file and a deck name in the config.json!`
    );
  }

  if (!dataJson) {
    return console.log(
      `You must store a json file in the config.json! (Deck name: ${deckName})`
    );
  }

  var data;
  try {
    data = require(`./data/${dataJson}`);
  } catch (err) {
    return console.log(
      `The json file specified in config.json does not exist! (Deck name: ${deckName})`
    );
  }

  const forbiddenCharacters = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];

  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];

  const forbiddenItems = [...forbiddenCharacters, ...reservedNames];

  if (!deckName) {
    return console.log(
      `You must store a deck name in the config.json! (Json file: ${dataJson})`
    );
  } else if (forbiddenItems.some((item) => deckName.includes(item))) {
    console.log("- Your deck name contains forbidden characters and/or words!");
    console.log(`| Forbidden characters: ${forbiddenCharacters.join(", ")}`);
    console.log(`| Reserved names: ${reservedNames.join(", ")}`);
    console.log(`- Deck name: ${deckName}`);
    return;
  }
  if (!data?.cards || data.cards.length == 0) {
    console.log(`Your ${dataJson} doesn't match the correct structure!`);
    console.log("{");
    console.log('    "cards": [');
    console.log("        {");
    console.log('            "front": "example",');
    console.log('            "back": "example",');
    console.log('            "tags": ["example"]');
    console.log("        }");
    console.log("    ]");
    console.log("}");
    return;
  }

  console.log(`Processing ${data.cards.length} cards for deck: ${deckName}`);
  console.log(`Using batch size: ${batchSize}`);

  // Process cards in batches to avoid memory issues
  const totalBatches = Math.ceil(data.cards.length / batchSize);
  const batches = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, data.cards.length);
    const batchCards = data.cards.slice(startIndex, endIndex);

    console.log(
      `Processing batch ${batchIndex + 1}/${totalBatches} (cards ${
        startIndex + 1
      }-${endIndex})`
    );

    const apkg = new AnkiExport(deckName);
    let addedCards = 0;

    for (let i = 0; i < batchCards.length; i++) {
      const card = batchCards[i];

      if (!card?.front || !card?.back) {
        console.log("- Following card couldn't be added (missing front/back):");
        console.log(`| Front: ${card?.front}`);
        console.log(`| Back: ${card?.back}`);
        console.log(`| Tags: ${card?.tags}`);
        console.log(`| Card number: ${startIndex + i + 1}`);
        console.log(`- Deck name: ${deckName})`);
        continue;
      }

      try {
        apkg.addCard(card.front, card.back, { tags: card.tags || [] });
        addedCards++;
      } catch (err) {
        console.log(
          `- Something went wrong with card ${
            startIndex + i + 1
          }! (Deck name: ${deckName})`
        );
        console.log(`| Error: ${err.message}`);
        console.log(`| Front: ${card.front}`);
        console.log(`| Back: ${card.back}`);
      }
    }

    if (addedCards > 0) {
      try {
        const zip = await apkg.save();
        const fileName =
          totalBatches > 1
            ? `${deckName}_part${batchIndex + 1}.apkg`
            : `${deckName}.apkg`;
        fs.writeFileSync(`./apkg/${fileName}`, zip, "binary");
        console.log(`✓ ${fileName} was generated with ${addedCards} cards!`);
        batches.push(fileName);
      } catch (err) {
        console.log(`- Error saving batch ${batchIndex + 1}: ${err.message}`);
      }
    }
  }

  if (totalBatches > 1) {
    console.log(`\n✓ Deck '${deckName}' was split into ${totalBatches} files:`);
    batches.forEach((batch) => console.log(`  - ${batch}`));
    console.log(
      "\nTo import into Anki, import each file separately or combine them manually."
    );
  }
}

async function createDecks() {
  if (!config.decks || config.decks.length == 0) {
    console.log("Your config.json doesn't match the correct structure!");
    console.log("{");
    console.log('    "decks": [');
    console.log("        {");
    console.log('            "dataJson": "example.json",');
    console.log('            "deckName": "example",');
    console.log('            "batchSize": 50');
    console.log("        }");
    console.log("    ]");
    console.log("}");
    return;
  }

  for (let i = 0; i < config?.decks.length; i++) {
    const deck = config.decks[i];
    const batchSize = deck?.batchSize || 50; // Default batch size of 50 cards

    console.log(`\n=== Processing deck ${i + 1}/${config.decks.length} ===`);
    await createDeck(deck?.dataJson, deck?.deckName, batchSize);
  }
}

createDecks().catch((err) => {
  console.error("Error creating decks:", err);
  process.exit(1);
});
