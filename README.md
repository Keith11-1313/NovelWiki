# Novel Wiki Project

This is a personal wiki I made for tracking and browsing novel data. It runs completely in the browser — no server needed, no backend setup. All the data comes from a JSON file you import yourself.

I built this as a static web app because I didn't want to deal with hosting or accounts. Everything gets saved to your browser's local storage so it persists between sessions.

---

## How to Run

Just open `index.html` in your browser. That's it. No npm, no build step, nothing to install.

> Works best in Chrome or Edge. Firefox should be fine too.

---

## File Structure

Here's a quick breakdown of what each file does:

```
wiki-project/
│
├── index.html          # The main library page — shows all your imported novels
├── import.html         # Where you import a novel JSON file and merge analysis data
├── wiki.html           # The actual wiki viewer — handles routing between wiki pages
│
├── css/
│   └── style.css       # All the styling is here, including responsive/mobile styles
│
├── js/
│   ├── store.js        # Handles saving and loading data from localStorage
│   ├── render.js       # Contains the functions that build the page content dynamically
│   ├── search.js       # In-memory search — filters entries as you type
│   └── genre.js        # Manages genre-specific sidebar navigation links
│
└── project files/
    ├── instruction.txt     # Instructions for generating the JSON (used with AI tools)
    └── combined_schema.json  # The schema the JSON data has to follow
```

---

## How to Add a Novel

1. Prepare a JSON file that follows the format in `combined_schema.json`
2. Go to `import.html`
3. Use the file upload to load your JSON
4. If you have a separate analysis JSON, you can merge it in on the same page
5. Once imported, the novel should show up in `index.html`

The import page also has a step-by-step guide if you're not sure how to make the JSON. You can download the instruction and schema files from there too.

---

## Storage Notes

- All novel data is stored in your **browser's localStorage** — it doesn't get sent anywhere
- Each novel gets a stable generated ID so renaming the title won't break anything
- If you clear your browser data, the novels will be gone (no cloud backup)
- The "Recently Opened" list on the library page only shows novels that are still imported

---

## Known Limitations

- No schema validation on import — if your JSON is wrong, it might just show blank data
- Search only works on data that's already loaded in memory (no fuzzy search)
- Cover images need to be in the same folder since everything runs locally

---
