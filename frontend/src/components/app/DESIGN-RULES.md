# Avareno `/app` design rules

The contract for every authenticated `/app` route. Source of truth: the `/app`
home (`pages/SmartHome.tsx`). Tokens live in `styles.css :root` (`--av-*`).
Scope: `/app` only — never the public marketing website.

> Direction: **calm by default, magical when Avareno understands something.**
> The "magic" is comprehension made visible (the Object Memory Map, completeness
> bars, warranty timelines) — not motion, glow, or decoration.

## Do not add

Charts/crypto graphs · teal fog · decorative glow · bento overload ·
landing-page effects · generic admin-dashboard UI · overwhelming animation ·
emoji as icons (use `lucide-react`).

## Color — one accent per meaning

Neutral surfaces by default. Color carries meaning, never decoration.

| Token | Meaning |
|---|---|
| `--av-accent` (teal) | primary · active · care · open loop |
| `--av-warning` (amber) | warranty · deadline approaching |
| `--av-danger` (red) | missing · incomplete |
| `--av-success` (green) | present · resolved |
| neutral surfaces/text | everything else |

Never use a second accent for the same meaning, and never use color as the only
signal — pair it with an icon or label (see `StatusChip`).

## Tokens — reference, don't re-guess

- Radius: `--av-radius-sm` chips/controls · `--av-radius-md` rows/panels ·
  `--av-radius-lg` cards/sections · `--av-radius-pill` chips/tags/avatars.
- Spacing: 4px rhythm `--av-space-1..6`. No off-scale gaps.
- Type: `--av-type-xs` kickers → `--av-type-xl` page/hero headings;
  body line-height `--av-leading-body`.
- Elevation: `--av-shadow-1` resting cards, `--av-shadow-2` overlays only.
- Motion: `--av-dur-fast`/`--av-dur` + `--av-ease`; respect
  `prefers-reduced-motion`; animate transform/opacity only.

## Components — use AppKit, don't reinvent

From `components/app/AppKit.tsx`:

- **Layout:** `AppPage` → `AppPageHeader` (kicker/title/subtitle/actions) →
  `AppMainGrid` (`AppMainColumn` + `AppSideColumn`) → `AppSection` / `AppPanel`.
- **Status:** `StatusChip` (tone vocabulary), `DocumentChip`, `WarrantyChip`,
  `CareStatusChip`, `IconTile`, `MetadataRow`, `ProgressLine`.
- **Actions:** `ActionButton` (one primary per view), `SecondaryAction`.
- **Memory Build (signature):**
  - `ObjectMemoryCard` — a stored object as Beleg/Garantie/Offen layers + completeness.
  - `ObjectMemoryGraph` — what an object connects to (relationship, not analytics).
  - `WarrantyTimeline` — time until warranty ends.
  - `CareTimeline` — where an issue sits in its lifecycle.
  - `OpenLoopRow` — an open loop tied back to its product.

Rule of thumb: a list of objects → `ObjectMemoryCard`; a list of open tasks →
`OpenLoopRow`/`AttentionRow`; an object's relationships → `ObjectMemoryGraph`.

## Per-route migration order

1. ✅ Home (`SmartHome`) — source of truth
2. ✅ `/app/dinge` (`Items`) · ✅ `/app/care` (`Care`)
3. ☐ `/app/resolve` (`Resolve`) — replace bespoke `resolve-*` with AppKit + tokens.
   Caution: Resolve is a community support-ticket/Q&A system (create stepper,
   helper profiles, solution proposals), not a simple open-loop inbox —
   restyle only; do not change its behavior.
4. ☐ `/app/ich` (`Rewards`) — replace bespoke `profile-*` with AppKit + tokens
5. ☐ object detail (`ItemDetail`) — remove ~100 legacy `ozma-/text-ink` markers
6. ☐ capture flows (`Capture*`) — replace legacy `ozma-*`

Each migration: preserve all data and logic, swap classes for AppKit + `--av-*`,
keep it calm, verify in the browser preview before moving on.
