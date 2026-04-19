# Screenshots for Musicmap critique

Drop screenshots here with these exact filenames — the page's placeholders will pick them up automatically once you replace the `<figure class="placeholder">` blocks in `../index.html` with real `<img>` tags.

| File | What to capture |
|------|-----------------|
| `overview.png` | The full zoomed-out Carta showing all super-genres at their default framing |
| `carta-zoomed.png` | A zoomed-in region showing individual genre nodes and connecting lines |
| `relationships.png` | Hover state on a single genre, with its influence lines highlighted and others dimmed |
| `genre-detail.png` | A genre detail panel open, showing description and embedded 9-song playlist |
| `search.png` | The search bar in use, showing results for a query |
| `insight-1.png` | Screenshot that supports your first concrete insight |
| `insight-2.png` | Screenshot that supports your second concrete insight |

## Swapping a placeholder for a real image

Each placeholder in `index.html` looks like this:

```html
<figure class="placeholder">
  <span>overview.png<br/>— zoomed-out view of the full Carta showing all super-genres</span>
</figure>
```

Replace with:

```html
<figure>
  <img src="images/overview.png" alt="Zoomed-out view of the full Musicmap Carta"/>
</figure>
```

Keep the `<figcaption>` that follows each figure.
