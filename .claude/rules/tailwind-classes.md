---
paths:
  - 'src/**/*.tsx'
---

# Tailwind classes in this repo

Tailwind's stock palette still compiles: `bg-white`, `text-gray-500` and
`bg-red-500` produce valid CSS and no gate reports them. The screen is simply
off-brand. The theme names below are declared in `src/app/globals.css`
(`@theme inline`) on top of the copied tokens (ADR 0002).

| Concern | Use | Do not use |
|---|---|---|
| Colour | alias names: `bg-surface-card`, `text-text-muted`, `border-border-hairline`, `bg-action-primary`, `text-error` | the stock palette; base palette names such as `--milk`, `--terracotta`, `--ink`, even inside `[var(...)]` |
| An alias not in `@theme` | add one `--color-*` line to `globals.css`, then use the class | the class alone: it silently generates nothing |
| Font size | `text-hero display heading subheading body-lg body body-sm ui eyebrow num` (each carries its line height) | `text-sm`, `text-xl`; an arbitrary `text-[Npx]` unless the prototype uses a size that is not on the scale |
| Size vs colour | `text-heading` = size, `text-text-heading` = colour | mixing them up |
| Line height | at least 1.2, headings too. Vietnamese diacritics need the room | `leading-none`, `leading-tight` |
| Font family | `font-display` (Baloo 2), `font-ui` (Be Vietnam Pro), `font-num` (IBM Plex Sans) | `font-sans`, a family name |
| Weight | `font-normal`, `font-medium`, `font-semibold` | anything else |
| Spacing | Tailwind's number scale. `p-4` = 16px = `--space-4` | arbitrary px when a step exists |
| Radius | `rounded-xs sm md lg xl 2xl pill`; a card is `rounded-lg` | bare `rounded`, `rounded-full` |
| Shadow | `shadow-overlay` for real overlays only; `shadow-raise` | a shadow to lift a card. Cards sit on the page by fill |
| Breakpoint | `rail:` and `wide:` for the app shell's three shapes | measuring the width in JavaScript |
| Theme | nothing. There is no dark mode | `dark:` |
| Blush `bg-surface-warm` | speech only: the assistant panel, the receptionist's line | a callout, a badge, a notice in a form |
| Overflow | `overflow-x-clip` | `overflow-x-hidden`: it kills `position: sticky` |
| Motion | wrap entrance animations in `motion-safe:` | an animation without that variant |

Values live in `src/styles/tokens/*.css`. Never edit those files; re-copy them
(ADR 0002). What each colour means is in `docs/visual-language.md`.
