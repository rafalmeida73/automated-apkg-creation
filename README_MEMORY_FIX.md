# Memory Issue Fix for Anki APKG Creation

## Problem

When creating Anki decks with a large number of cards (typically 60+ cards), the `anki-apkg-export` library encounters WebAssembly memory limitations, causing the error:

```
Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value 16777216, (2) compile with -s ALLOW_MEMORY_GROWTH=1 which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with -s ABORTING_MALLOC=0
```

## Solution

The memory issue has been resolved by implementing batch processing that creates smaller APKG files rather than trying to fit all cards in a single deck.

### How it works:

1. **Batch Processing**: Cards are processed in configurable batches (default: 50 cards per batch)
2. **Automatic Splitting**: Large decks are automatically split into multiple APKG files
3. **Memory Management**: Each batch creates a new AnkiExport instance, preventing memory accumulation
4. **Error Handling**: Better error reporting and recovery

### Configuration Options:

#### 1. Basic Usage (npm scripts)

```bash
# Run with default Node.js memory settings
npm start

# Run with increased Node.js memory (4GB)
npm run start:memory
```

#### 2. Batch Size Configuration

In your `config.json`, you can specify the batch size per deck:

```json
{
  "decks": [
    {
      "dataJson": "dataFormat.json",
      "deckName": "volka",
      "batchSize": 30
    }
  ]
}
```

- **Small batch (20-30 cards)**: Most reliable, creates more files
- **Medium batch (50 cards)**: Good balance of reliability and file count
- **Large batch (100+ cards)**: May hit memory limits on large datasets

### Output Examples:

#### With batch processing (batchSize: 30):

```
Processing 124 cards for deck: volka
Using batch size: 30
Processing batch 1/5 (cards 1-30)
✓ volka_part1.apkg was generated with 30 cards!
Processing batch 2/5 (cards 31-60)
✓ volka_part2.apkg was generated with 30 cards!
...
✓ Deck 'volka' was split into 5 files:
  - volka_part1.apkg
  - volka_part2.apkg
  - volka_part3.apkg
  - volka_part4.apkg
  - volka_part5.apkg
```

#### Single file (if batch size >= total cards):

```
Processing 50 cards for deck: vocabulary
Using batch size: 50
Processing batch 1/1 (cards 1-50)
✓ vocabulary.apkg was generated with 50 cards!
```

### Importing into Anki:

1. **Multiple files**: Import each `.apkg` file separately in Anki
2. **Same deck name**: All parts will be merged into the same deck automatically
3. **Manual combination**: Alternatively, you can combine the data files before processing

### Memory Limits Found:

- **Consistent limit**: Memory errors start appearing around 58-60 cards
- **Total memory**: WebAssembly module limited to 16MB (16777216 bytes)
- **Node.js memory**: Increasing Node.js heap doesn't fix the WebAssembly limitation

### Recommended Settings:

- **For reliability**: Use batch size of 30-40 cards
- **For fewer files**: Use batch size of 50 cards (may occasionally fail)
- **For maximum cards per file**: Use batch size of 55-60 cards (risky)

### Technical Details:

The issue is caused by the WebAssembly module used internally by `anki-apkg-export`. The module has a fixed memory limit that cannot be increased from the Node.js side. The solution creates multiple smaller APKG instances rather than one large one.
