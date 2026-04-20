# Novel Wiki

Static personal wiki for imported novel data and Qwen analysis output.

## Run

Open `index.html` directly in a browser.

## Structure

- `index.html`: library view
- `import.html`: base import and analysis merge
- `wiki.html`: wiki shell and routing
- `js/store.js`: local storage persistence
- `js/render.js`: page renderers
- `js/search.js`: in-memory search
- `js/genre.js`: genre-specific navigation

## Notes

- Novels now use stable generated IDs instead of title-derived storage keys.
- Validation against the provided schemas is not included in this patch.
