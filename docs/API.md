# Roles: API reference

Source documentation for `Roles.tsx`. For how and why it works, see [TECHNICAL.md](TECHNICAL.md).

## Usage

```tsx
import Roles, { ROLES, RESOURCES, type Role } from './Roles';

// With no props it shows a sample workspace.
<Roles />

// Your own data.
<Roles
  roles={myRoles}
  resources={myResources}
  selected="editor"
  onSave={(roles: Role[]) => api.saveRoles(roles)}
  theme="dark"
/>
```

Requires React 18 or 19. There are no other dependencies.

## Exports

| Export | Kind | Description |
|---|---|---|
| `default` (`Roles`) | Component | The roles and permissions card. |
| `Level` | Type | `0 \| 1 \| 2 \| 3`: None, View, Edit, Manage. |
| `Resource` | Type | One part of the product that a role can reach. |
| `Role` | Type | A role and its level for each resource. |
| `RESOURCES` | `Resource[]` | The six sample resources. |
| `ROLES` | `Role[]` | The five sample roles. |

`RolesProps` is not exported; use `React.ComponentProps<typeof Roles>` if you need it.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `roles` | `Role[]` | `ROLES` | The roles to edit. Read once, on mount. Must not be empty. |
| `resources` | `Resource[]` | `RESOURCES` | The rows, in order. Every role's `levels` should have a key for each `id`; a missing key counts as None. |
| `selected` | `string` | `'editor'` | The id of the role shown first. Falls back to the first role if no role has this id. |
| `onSave` | `(roles: Role[]) => void` | none | Called 650 ms after Save is clicked, with every role including new ones and without removed ones. The return value is ignored. |
| `theme` | `'light' \| 'dark'` | `'light'` | Colour theme. The component does not follow the system setting by itself. |
| `loadFont` | `boolean` | `true` | Adds a Google Fonts stylesheet for Inter and JetBrains Mono to `document.head`, once per page. |
| `className` | `string` | none | Added to the card's root element alongside `rp`. |
| `style` | `CSSProperties` | none | Inline style on the root element. |

Because `roles` and `selected` are only read on mount, passing new values later has no effect. To reset the editor, change its `key`:

```tsx
<Roles key={workspaceId} roles={rolesFor(workspaceId)} />
```

## Types

### `Resource`

```ts
type Resource = {
  id: string;                         // key into Role.levels
  name: string;                       // row title, and the word used in the sentence
  hint: string;                       // one line under the name
  icon: string;                       // SVG path data for a 24×24 stroke icon
  can: [string, string, string];      // what View, Edit and Manage allow, in that order
  sensitive?: boolean;                // at Manage, the rail turns orange and the row says "Sensitive"
};
```

In the sentence, `name` is lower-cased unless it starts with two capitals ("API keys"). A name ending in "s" is treated as plural ("API keys stay hidden").

### `Role`

```ts
type Role = {
  id: string;
  name: string;
  people: number;                     // how many people have the role
  initials: string[];                 // every entry is shown; people beyond them become "+N" (pass up to three)
  levels: Record<string, Level>;      // keyed by Resource.id
  locked?: boolean;                   // no level can change; rails shake when poked
  custom?: boolean;                   // listed under "Your roles"; can be renamed and deleted
};
```

Initials should be two characters. Their background tint is picked from the sum of the first two character codes.

### Sample data

| Role | People | Projects | Documents | Members | Billing | API keys | Settings | Flags |
|---|---|---|---|---|---|---|---|---|
| Owner | 1 | Manage | Manage | Manage | Manage | Manage | Manage | `locked` |
| Admin | 2 | Manage | Manage | Manage | View | Edit | Edit | |
| Editor | 5 | Edit | Edit | View | None | None | View | |
| Viewer | 12 | View | View | View | None | None | None | |
| Finance | 2 | View | View | None | Manage | None | None | `custom` |

Members, Billing and API keys are `sensitive`.

## What `onSave` receives

The full working list of roles, in list order:

- Edited levels and names.
- New roles, with ids like `role-lq3k9x2a`, `custom: true`, `people: 0` and no initials.
- Removed roles are absent, and their `people` count has been added to Viewer (or to the first other unlocked role if there is no Viewer).

To save only what changed, diff it against the roles you passed in.

## Behaviour summary

| Action | Result |
|---|---|
| Click a rail stop | Sets that level. On a locked role, shakes the rail instead. |
| Arrow keys on a rail | Left/Down: one level lower. Right/Up: one higher. Home: None. End: Manage. |
| Hover or focus another role | Dashed rings on every rail show that role's levels. |
| Chevron | Opens the row and lists what each level allows. |
| New role | Adds "New role" with every level at None, opens it and selects its name. |
| Duplicate | Copies the open role as "Name copy". Works on built-in roles too; the copy is custom and unlocked. |
| Delete (custom roles only) | Asks in a red strip, then removes the role and moves its people. |
| Discard | Restores every role to the last save. |
| Save | Spinner for 650 ms, then the Saved tick, then `onSave`. The bar leaves after 1.7 s. |

## CSS hooks

Every rule is scoped under the root class `.rp`, so nothing affects the host page. To restyle, override the custom properties on your own class:

```css
.my-roles.rp { --acc: #0f766e; --warm: #b45309; --warmtx: #92400e; }
```

| Property | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#ffffff` | `#121214` | Card background |
| `--ink` | `#18181a` | `#f2f2f3` | Main text, rail fill, knob, the bar |
| `--txt` | `#55555b` | `#b4b4ba` | Body text, icons |
| `--mute` | `#6f6f75` | `#8b8b92` | Secondary text, labels |
| `--faint` | `#c9c9cc` | `#47474d` | Empty stops, dashes |
| `--line` | `#eeeeec` | `#232327` | Hairlines, card border |
| `--soft` | `#f6f6f4` | `#1b1b1f` | Open role, icon tiles |
| `--hov` | `#fafaf9` | `#17171a` | Role hover |
| `--track` | `#ebebe8` | `#2a2a2f` | Empty rail track and Reach segments |
| `--acc` | `#3d50e8` | `#8293ff` | Compare rings, unsaved dots, focus rings |
| `--ok` | `#1f9d55` | `#3ccf7d` | Ticks and the Saved circle |
| `--warm` | `#e5602f` | `#ff7a4a` | Sensitive rail at Manage, last Reach segments |
| `--warmtx` | `#c4471a` | `#ff7a4a` | The word "Sensitive" (darker, for text contrast) |
| `--danger` | `#c93a3a` | `#ff6b6b` | Delete strip text and button |
| `--dtint` | `#fdf3f3` | `#2a1717` | Delete strip background |

If you change a text colour, check it still reaches 4.5:1 on the surfaces it sits on.

### Layout breakpoints

These are container queries on the card, so they follow the card's width, not the window's.

| Query | Effect |
|---|---|
| `max-width: 808px` | Roles become a wrapping row of buttons; rails move under each row's name. |
| `max-width: 568px` | Head stacks; padding 18 px × 14 px; action labels hide; the Saved hint shortens. |
| `prefers-reduced-motion: reduce` | Every transition and animation inside the card is turned off. |

## Source map

Line numbers are for the current `Roles.tsx`.

| Lines | Symbol | Role |
|---|---|---|
| 15–28 | `Level`, `Resource`, `Role`, `RolesProps` | Types |
| 30–51 | `RESOURCES`, `ROLES`, `all()` | Sample data |
| 52–54 | `LEVELS`, `VERB`, `TINTS` | Labels, sentence verbs, avatar tints |
| 56–230 | `CSS` | Kit-shield, tokens, component rules, keyframes, container queries |
| 232–240 | `Icon`, `I`, `Drawn` | Stroke icons and the self-drawing tick |
| 243–252 | `Expand` | Height-animated open and close |
| 255–269 | `CountUp` | Counts Reach to its value |
| 271–273 | `noun`, `join`, `same` | Sentence casing, "a, b and c" lists, role equality |
| 276–291 | `Sentence` | The plain-language summary |
| 293 | `Roles` | The component |
| 296–308 | State and refs | See TECHNICAL.md §2 |
| 310–326 | Effects | Font link, list thumb, name focus, Saved timeout |
| 328–337 | Derived values | `role`, `was`, `other`, `changes`, `reach`, `most`, `builtIn`, `custom` |
| 339–370 | Handlers | `patch`, `setLevel`, `onRailKey`, `addRole`, `removeRole`, `discard`, `save` |
| 372–388 | `roleBtn` | One role in the list |
| 390–506 | Render | Head, list, open role, rows, bar |

## Diagrams

- [How data moves through Roles](diagrams/data-flow.html)
- [The unsaved-changes lifecycle](diagrams/save-lifecycle.html)
- [What happens when a level is set](diagrams/set-level.html)
