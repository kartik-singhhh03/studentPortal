# Design System — Es Magico Student Results Portal

## Colour palette

| Token | Hex | Use |
|---|---|---|
| Near black | `#171717` | Primary text, primary actions |
| Charcoal | `#404040` | Secondary text |
| Neutral gray | `#737373` | Muted labels, placeholders |
| Light gray | `#E5E5E5` | Borders, dividers |
| Off-white | `#FAFAFA` | Page background |
| White | `#FFFFFF` | Surfaces, tables, forms |

Semantic colours (success / warning / error) are reserved for status only.

## Tokens (CSS)

Defined in `src/app/globals.css`: radius (`--radius-sm/md`), shadows (`--shadow-sm/md`), motion (`--duration-fast/normal`, `--ease-out`). Utility classes: `.surface`, `.page-enter`, `.table-row-hover`, `.dropzone`, `.progress-indeterminate`, `.skeleton-shimmer`.

## Principles

- Premium, minimal, professional monochrome SaaS
- Typography: Geist
- Consistent spacing; thin borders; subtle shadows
- Clear hierarchy; accessible focus rings
- Responsive desktop, tablet, and mobile
- Motion ~150–200ms; respect `prefers-reduced-motion`

## Avoid

- Flashy gradients, neon colours, glassmorphism
- Decorative charts, oversized cards, excessive animation
