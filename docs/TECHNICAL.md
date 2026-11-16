# Roles: technical write-up

`Roles.tsx` is a roles and permissions editor for the settings area of a SaaS product. It is one React file with no dependencies beyond React 18 or 19: the component, its sample data, its CSS and its small helpers all live in that file.

This document explains how it works and why it is built the way it is. For the props, types and CSS hooks, see [API.md](API.md).

| Diagram | What it shows |
|---|---|
| [How data moves through Roles](diagrams/data-flow.html) | Props, state, handlers, derived values and the `onSave` callback |
| [The unsaved-changes lifecycle](diagrams/save-lifecycle.html) | Clean, Dirty, Saving and Saved, and what moves between them |
| [What happens when a level is set](diagrams/set-level.html) | The path from a click or key to a new level, including the locked Owner |

The diagrams are standalone HTML pages. GitHub shows their source rather than rendering them, so open them from a clone in a browser.

---

## 1. The model

Access is a **level per resource**, not a set of checkboxes.

```ts
type Level = 0 | 1 | 2 | 3;   // None, View, Edit, Manage
type Role  = { id, name, people, initials, levels: Record<resourceId, Level>, locked?, custom? };
```

Levels are cumulative: Edit includes View, and Manage includes both. A grid of checkboxes lets someone tick "Edit" without "View", which is a state the product cannot honour. A four-stop rail cannot express that state at all, so there is nothing to validate.

Each resource carries three lines of copy, `can: [view, edit, manage]`, which the row's detail panel lists with a tick for every line at or below the current level.

A role is **built in** unless it has `custom: true`. Only custom roles can be renamed or deleted. A role with `locked: true` cannot be changed at all; the sample Owner is the only one.

## 2. State

All state lives in the `Roles` component (`Roles.tsx:296–308`).

| State | Purpose |
|---|---|
| `saved` | The last saved roles. Starts as the `roles` prop. |
| `roles` | The working copy every edit goes to. Starts as the `roles` prop. |
| `sel` | The id of the open role. |
| `cmp` | The id of the role being compared (hovered or focused), or `null`. |
| `open` | Which resource rows have their detail panel open. |
| `nudge` | Which locked rail was last poked, and a counter, to replay the shake. |
| `deleting` | Whether the delete confirmation strip is showing. |
| `saving` | `''`, `'busy'` (spinner) or `'done'` (the Saved tick). |
| `thumb` | The vertical offset of the ink bar beside the open role. |

The design has one central idea: **keep two copies and diff them.** Nothing records edits as they happen. Every unsaved marker is computed on each render by comparing `roles` with `saved` (see [the data-flow diagram](diagrams/data-flow.html)):

- **Change count** (`Roles.tsx:331`): one per role that is new, one per role that was removed, one per renamed role, and one per resource whose level differs.
- **Role dot** in the list: `same()` compares the role's name and levels with its saved version.
- **Row dot** on a resource: that resource's level differs from the saved role.

Because the count is a diff, undoing an edit by hand lowers it, and renaming a role back to its old name removes that change. There is no undo stack to keep in step with the data.

Props are read **once**, as the initial value of `saved`, `roles` and `sel`. Passing new `roles` later does not reset the editor. To load a different workspace, remount it with a new `key`.

## 3. Derived values

These are recomputed on every render and never stored:

| Value | Rule |
|---|---|
| `role` | The open role: `roles.find(id === sel)`, or the first role. |
| `other` | The compared role, when it is not the open one. |
| `reach` | The sum of the open role's levels. With six resources the maximum is 18. |
| The sentence | Built by `Sentence` from the open role's levels (below). |

### The sentence

`Sentence` (`Roles.tsx:276`) turns the levels into one line of plain English:

1. Group the resources by level, highest first: Manage, Edit, View.
2. Write each group as a verb and a joined list, for example **edit** projects and documents.
3. List every resource at None as hidden.

Three cases are special:

- Nothing allowed: "New role can't see anything yet. Choose what it can reach below."
- Everything at Manage: "Owner can **manage** everything."
- An empty name falls back to "This role".

Resource names are lower-cased unless they start with two capitals, so "API keys" keeps its case. The verb for a single hidden resource is "stays" unless the name ends in "s" ("Billing stays hidden", "API keys stay hidden"). That last rule is a heuristic and will be wrong for a singular name ending in "s".

The sentence's `key` includes the role id and its levels. A new key remounts the element, which replays the blur-in animation every time the meaning changes.

## 4. Handlers

| Handler | What it does |
|---|---|
| `patch(fn)` | Replaces the open role in `roles` with `fn(role)`. Every edit goes through it. |
| `setLevel(res, l)` | Sets one level, clamped to 0–3. On a locked role it changes nothing and bumps `nudge` instead. |
| `onRailKey` | Maps Left/Down to one level lower, Right/Up to one higher, Home to None and End to Manage, then moves focus to the new stop. |
| `addRole(from?)` | Adds a custom role: "New role" with every level at None, or "Name copy" with the levels of `from`. Opens it and selects its name. |
| `removeRole()` | Removes the open custom role and adds its people to Viewer, or to the first other unlocked role if there is no Viewer. |
| `discard()` | Sets `roles` back to `saved`. If the open role no longer exists, opens the first saved role. |
| `save()` | Shows the spinner, then after 650 ms copies `roles` into `saved` and calls `onSave(roles)`. |

### Setting a level

See [the set-level flowchart](diagrams/set-level.html). The one subtle part is the locked rail.

A locked rail answers a click or key with a shake. The shake is a CSS animation, and to replay it on every attempt the rail needs to restart that animation. Remounting the rail would do that, but it also destroys the focused button, and keyboard users would lose their place. Instead, the class alternates between `shake` and `shake again`, which point at two identical keyframes (`rp-shake` and `rp-shake2`). Changing the animation name restarts it while the element, and its focus, stay put.

### Saving

See [the lifecycle diagram](diagrams/save-lifecycle.html).

- While `saving` is `'busy'`, Discard is disabled and further Save clicks are ignored.
- `save()` captures `roles` when it is clicked. An edit made during the 650 ms is not part of that save; once the Saved tick goes, it shows as an unsaved change.
- The 650 ms is a stand-in for a request. `onSave` is called after the local copy is updated and its result is not awaited, so a real backend error has no way back into the UI yet.

## 5. Rendering

The card has three regions: the head (title and New role), the role list on the left, and the open role on the right. The open role shows its name, the actions, the sentence, Reach, the delete strip when asked, one row per resource, and the bar.

**Rails.** Each rail is a `role="radiogroup"` of four `role="radio"` buttons. Only the checked stop is in the tab order (`tabIndex` 0, the rest −1), so Tab enters and leaves the rail in one step and arrow keys move within it. The fill, knob and compare ring are absolutely positioned spans driven by two CSS custom properties: `--l` for the level and `--g` for the compared role's level. Every rail gets a delay of 40 ms times its row index (`--dl`), which gives the staggered slide when you switch roles.

**Compare.** Hovering or focusing a role that is not open sets `cmp`. Every rail then gets `cmp-on`, which scales in a dashed ring at the compared role's level. Touch screens have no hover, so on a phone the rings appear only when a role button takes keyboard focus.

**Expand.** The delete strip and the row details open by animating `grid-template-rows` from `0fr` to `1fr`, so they need no measured height. `Expand` keeps its content mounted for 420 ms after closing so the collapse can play.

**CountUp.** Reach counts to its new value on a 30 ms interval for 600 ms with an ease-out curve. It uses a timer rather than `requestAnimationFrame` so it always finishes, even in a background tab. With reduced motion it jumps straight to the value.

**The list thumb.** The ink bar beside the open role is positioned from the button's `offsetTop` and follows the list's size with a `ResizeObserver`.

## 6. Styling

All CSS is a string in the file, written into a `<style>` element inside the card. It has three parts.

1. **The kit-shield** (`Roles.tsx:56`). Every rule is wrapped in `:where(.rp)`, which has zero specificity, and reverts Tailwind's preflight resets inside the card. The component therefore looks the same with or without Tailwind on the page, and any rule of its own wins over the shield.
2. **Tokens** on `.rp` and `.rp.dark`: colours as custom properties. The `theme` prop switches between them; the component does not follow `prefers-color-scheme` by itself.
3. **Component rules**, every one under `.rp`, so nothing leaks onto the host page.

The CSS goes in through `dangerouslySetInnerHTML`. React 18's server renderer escapes quotes and `>` in a text child, which broke selectors such as `[aria-checked="true"]` in server-rendered HTML and forced React to throw the page away and render it again in the browser. The string is a constant in the file, so there is no injection risk.

### Container queries

`.rp` is a size container, so the layout follows the card's width rather than the window's. That matters when the card sits in a narrow column on a wide screen.

| Card content width | Layout |
|---|---|
| over 808 px | Role list on the left, rails beside each row's name |
| 808 px and under | Roles become one wrapping row of outlined buttons; rails move under each row's name |
| 568 px and under | Head stacks, padding drops to 18 px × 14 px, action labels hide, the Saved hint shortens |

The card has no padding of its own: it sits on an inner `.pad` element. A container query cannot style its own container, so this is what lets the narrow query change the padding. The 808 and 568 thresholds are the spec's 760 and 520 plus the 48 px of padding the card used to have, so the layout switches at exactly the same widths.

### Contrast

Every text colour meets 4.5:1 against the surface it sits on, in both themes: the lowest is 4.61:1 in light and 5.07:1 in dark. Two tokens exist only for this. `--mute` is darker than the original spec, and `--warmtx` is a darker orange used only for the word "Sensitive", while the rails keep the brighter `--warm`.

### Motion

All motion is CSS transitions and keyframes plus two small timers (`Expand` and `CountUp`). Under `prefers-reduced-motion: reduce`, one rule turns off every transition and animation inside `.rp`, and `CountUp` skips its count.

## 7. Server rendering

The file starts with `"use client"`, and nothing reads `window` or `document` while rendering: browser APIs are only touched inside effects and event handlers. It renders on the server with React 18 and 19, and with React 18 the server HTML hydrates with no mismatch.

`loadFont` (default `true`) adds one Google Fonts stylesheet for Inter and JetBrains Mono to `document.head`, once, keyed by the id `rp-fonts`. Pass `loadFont={false}` if the host page loads its own fonts or must not call Google.

## 8. Accessibility

- Rails are radio groups with arrow, Home and End keys and a single tab stop. A locked rail keeps focus when poked.
- The open role in the list has `aria-current="true"`.
- The delete confirmation is `role="alertdialog"` with a label naming the role.
- The bar is `role="status"`, so the change count and "Saved" are announced.
- The chevron buttons have `aria-expanded` and a label naming the resource.
- Focus rings use the accent colour and appear only for keyboard focus (`:focus-visible`).

## 9. Known limits

- **Props are initial values only.** See section 2.
- **`roles` must not be empty.** The component assumes there is always an open role.
- **`onSave` is fire-and-forget.** There is no failure state; see section 4.
- **The delete strip always says "to Viewer"**, even when there is no Viewer and the people go to another role.
- **New role ids** come from `Date.now()`, so two roles created in the same millisecond would collide. A click cannot do that, but code calling the handler in a loop could.
- **The "stays" / "stay" rule** in the sentence is a heuristic based on a final "s".

## 10. How it was verified

- Strict TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`) against React 18 and React 19 types.
- Server render on React 18 and 19 with no `window` or `document`, and a React 18 hydration check with no mismatch.
- A browser pass over every behaviour in the spec's checklist: the sentence, the warm rail and "Sensitive", compare rings, the locked Owner, New role, Duplicate, Delete, Discard, Save and `onSave`.
- Keyboard: arrow, Home and End keys on unlocked rails, and focus kept on locked ones.
- Layout from 320 to 1280 px with no sideways scroll, and both container breakpoints.
- Contrast of every text node in light and dark mode.
- Reduced motion: no element animates.
