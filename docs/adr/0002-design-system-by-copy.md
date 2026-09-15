# ADR 0002: The design system is copied from Fonnus-Web-UI, tokens verbatim and components rewritten

**Status:** accepted · **Date:** 2026-09-15

## Decision

The product's look is defined in `../Fonnus-Web-UI`, a Vite prototype that publishes no
package. The only way to consume it is to copy files, and this ADR fixes what is copied and
what is rebuilt. It follows `../Fonnus-Admin/docs/adr/0003`, which made the same decision for
the internal console.

1. **Tokens are byte copies.** `src/styles/tokens/{colors,typography,spacing,shape,motion,
   base}.css` are copied unchanged from `../Fonnus-Web-UI/src/styles/tokens/`, each carrying
   one header line naming the source path and commit. That repo's `src/` copy is the source
   of truth; its `design-reference/_ds/` export is stale and lacks `--icon-accent`. A token
   change is a re-copy of the whole file, never an edit in place.
2. **Components write the alias layer, never the base palette.** `--surface-card`,
   `--text-muted`, `--border-hairline`, `--action-primary` and their siblings are what a
   screen names; `--terracotta`, `--milk`, `--ink` are not. `src/app/globals.css` republishes
   the alias layer as Tailwind theme names through `@theme inline`, so `bg-surface-card` and
   `text-text-muted` resolve to the copied variables and no hex is ever typed into a
   component.
3. **`fonts.css` is not copied.** It is a Google Fonts `@import`; here the three faces load
   through `next/font/google` in `src/app/layout.tsx` — Baloo 2 (display), Be Vietnam Pro
   (UI), IBM Plex Sans (numbers) — each with the `vietnamese` and `latin` subsets. The
   Vietnamese subset is the reason these faces were chosen: without it accented glyphs fall
   back mid-word and the page looks broken to exactly the audience it is for. `globals.css`
   repoints `--font-display / --font-ui / --font-num` at the hashed variables next/font
   emits, in a block of its own, so the copied `typography.css` stays byte-identical to its
   source.
4. **Markup is rebuilt in Tailwind, not copied.** The prototype writes one CSS Module per
   component; this repo writes utilities. The cost is real and accepted: a component cannot
   be pasted across from the prototype, only read from it. What is shared is the token
   layer, the geometry and the drawn shapes — not the markup.
5. **Icons are drawn, not installed.** `src/design-system/icons.ts` carries the prototype's
   inline-SVG glyphs, with the rule from `docs/visual-language.md` intact: one terracotta
   accent per glyph via `--icon-accent`, no stock icon set, no emoji in markup. The whole
   set is copied in one block rather than glyph by glyph: it is one file of path data, it
   is what makes a re-copy a straight overwrite, and picking glyphs out of it by hand
   would mean editing the file on every new screen — which is exactly how a copied file
   drifts from its source.
6. **Ordering in `globals.css` is load-bearing.** `@import "tailwindcss"` first, then the six
   token files imported *into* `layer(base)`. An unlayered rule beats every layered one, so
   an unlayered `h1 { font-size: 44px }` from `base.css` would win against a `text-[24px]`
   utility; inside the base layer it still overrides Tailwind's preflight, because it is
   imported after it, and still loses to utilities — which is the order a screen expects.
7. **`Logo` ships two variants, `mark` and `horizontal`.** The prototype's `Logo.tsx` also
   types `mark-mono` and `stacked`, but neither SVG exists in its `public/assets/SVG/` and
   nothing ever referenced them. Re-add a variant together with the file that draws it, not
   before.

`docs/visual-language.md` and `docs/ui-ux-principles.md` moved into this repo with the
screens they govern and are authoritative here; `../Fonnus-Web-UI` keeps pointers.

## Why

- The design is the part of the prototype the user named as absolutely authoritative. Tokens
  are also the part that changes least, so copying them is cheap and stays correct.
- Rewriting the markup is what the user asked for in the same sentence: the prototype's
  architecture and patterns are explicitly not to be inherited, only its design.
- Fonnus-Admin already wears these tokens under Tailwind. Choosing the same shape means a
  screen can move between the console and the product without being translated.

## Rejected

- **Copy the CSS Modules too and keep the prototype's convention.** It would make the
  prototype's components paste-able, which is worth something, but it re-imports the
  architecture the user asked to leave behind and diverges from the sibling Next.js repo.
- **Copy `design-reference/_ds/`, the exported design bundle.** It is stale — it predates
  `--icon-accent` — and copying a stale export instead of the live `src/` tokens is how two
  repos start disagreeing about a colour.
- **Depend on the prototype as a workspace package.** It publishes nothing, is not versioned
  for consumption, and is now frozen.

## Revisit when

- `../Fonnus-Web-UI` ever publishes a package — switch from copy to import and delete point 1.
- A token file has to be edited rather than re-copied — that means the prototype is no longer
  the source of truth and this ADR needs replacing, not amending.
