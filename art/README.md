# art/ — your own icons

Drop image files (JPG/PNG/WebP) here to use them in the **Icon of the day** on
Nofri Start, instead of (or alongside) the bundled Wikimedia ones.

To use an image you add here, open `data/icons.json` and add an entry with a
local `src` pointing at the file:

```json
{ "title": "The Good Shepherd", "note": "contemporary icon", "src": "art/good-shepherd.jpg" }
```

Entries with a `src` are loaded from this folder (works offline, no external
request). Entries with a `file` are loaded from Wikimedia Commons. The page
rotates through all entries by day and skips any image that fails to load.

A note on the images you shared: contemporary icons are usually under the
iconographer's copyright, so only add images you have the right to use. The
bundled entries are classical icons (mostly public domain) hosted on Wikimedia
Commons.
