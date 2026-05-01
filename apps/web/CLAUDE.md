# FlowDesk Web — Frontend Conventions

This file covers frontend-specific conventions for `apps/web/`. The root `CLAUDE.md` governs
the tech stack, multi-tenancy rules, and cross-cutting non-negotiables. Read it first.

---

## Folder Structure

```
apps/web/src/
├── routes/             # TanStack Router route files (file-based routing)
├── components/         # Shared, reusable UI components
├── features/           # Feature-scoped modules (see below)
├── hooks/              # Shared custom React hooks
├── lib/
│   ├── api.ts          # Centralised API client (axios instance + typed request helpers)
│   ├── queryKeys.ts    # Query key factory (single source of truth for all cache keys)
│   ├── queryClient.ts  # TanStack Query client instance and default config
│   └── theme.ts        # MUI theme definition
└── types/              # Frontend-only TypeScript types and interface extensions
```

### Feature Modules

Group code that only belongs to one feature under `features/<feature-name>/`:

```
features/
└── workspaces/
    ├── components/     # Components used only by this feature
    ├── hooks/          # Hooks used only by this feature
    └── queries.ts      # queryOptions definitions for this feature
```

Promote to `components/` or `hooks/` only when something is used by two or more features.
Do not create a `features/` subdirectory for a feature that has a single component.

---

## TanStack Router Conventions

### File-Based Routing

Use TanStack Router's file-based routing. The route tree in `src/routeTree.gen.ts` is
auto-generated — never edit it by hand.

File naming rules:

| Pattern | Purpose |
|---|---|
| `__root.tsx` | Root layout (providers, persistent shell) |
| `index.tsx` | Index route for the current segment |
| `_layout.tsx` | Pathless layout wrapper (no URL segment added) |
| `$paramName.tsx` | Dynamic segment route |
| `_layout/$paramName.tsx` | Dynamic segment nested under a layout |

Always define routes with `createFileRoute`:

```ts
export const Route = createFileRoute('/workspaces/$workspaceId')({
  component: WorkspacePage,
  loader: ({ params }) => loadWorkspace(params.workspaceId),
})
```

### Loaders

Use route loaders to prefetch data that the route requires. Loaders run before the component
renders, eliminating loading spinners for critical data.

- Call `queryClient.ensureQueryData(queryOptions(...))` inside loaders — do not duplicate fetch logic.
- Keep loaders thin: they resolve query data, nothing else. Business logic belongs in services or hooks.
- For data that is optional or lazy, fetch it in the component with `useSuspenseQuery`, not the loader.
- Pass `queryClient` to loaders via the router context — define the context type in `__root.tsx`.

### Navigation

Use `useNavigate` and `Link` from `@tanstack/react-router`. Never use the browser's native
`history` API or `window.location` directly.

---

## TanStack Query Conventions

### Query Key Factory

All query keys live in `src/lib/queryKeys.ts`. Use a factory object per resource:

```ts
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
}
```

Never write inline string arrays as query keys in components or hooks.

### Query Options

Define reusable query configs with `queryOptions()` in the feature's `queries.ts` file:

```ts
export const workspaceDetailOptions = (id: string) =>
  queryOptions({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => api.workspaces.getById(id),
    staleTime: 30_000,
  })
```

Pass these directly to `useSuspenseQuery` in components and to `ensureQueryData` in loaders.
This eliminates key/fn duplication between loaders and components.

### Data Fetching in Components

Prefer `useSuspenseQuery` over `useQuery` in route components. Wrap route components in
`<Suspense>` and `<ErrorBoundary>` at the route level in `__root.tsx` or layout files.

Use `useQuery` only when the data is genuinely optional and a loading state inside the
component is the correct UX.

### Mutations and Cache Invalidation

Use `useMutation` from TanStack Query for all write operations. On success, invalidate
affected keys using the factory:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
}
```

Apply optimistic updates for interactive actions where latency is noticeable (e.g. toggling
task completion, changing a member role). Roll back in `onError`. Do not apply optimistic
updates for destructive or irreversible actions (deletion, workspace transfer).

---

## MUI Theming Conventions

### Theme Definition

The MUI theme is defined in `src/lib/theme.ts` and provided at the root in `__root.tsx`.
All colour, typography, spacing, and shape decisions live there.

### Using the Theme

Access theme values via the `sx` prop or the `useTheme` hook. Never hardcode colour
hex values, pixel sizes, or font sizes in component code:

```tsx
// Correct
<Box sx={{ color: 'text.secondary', mt: 2 }} />

// Wrong
<Box sx={{ color: '#666666', marginTop: '16px' }} />
```

Use MUI's spacing scale (`mt: 1` = 8px) for all margin and padding. Do not mix MUI spacing
with arbitrary pixel values.

### Component Customisation

Customise MUI components at the theme level in `theme.ts` (`components` key) before
reaching for `sx` overrides at the usage site. A one-off `sx` override is fine; the same
override repeated in three places means it belongs in the theme.

Use `styled()` from `@mui/material/styles` only for components that require complex
CSS that `sx` cannot express cleanly (e.g. pseudo-elements, keyframe animations).

### Colour Usage

Reference semantic colour tokens, not palette positions:

```tsx
// Correct — semantic
color: 'error.main'
color: 'text.disabled'

// Wrong — positional
color: 'red'
color: 'grey.500'
```

Define any custom semantic tokens in `theme.ts` under `palette` — do not invent ad hoc
colour strings in components.

---

## Component Conventions

### When to Create a New Component

Extract a new component when:
- A piece of JSX is used in more than one place.
- A piece of JSX exceeds ~80 lines and has a clear, nameable responsibility.
- A stateful unit (its own loading state, its own form) is embedded in a larger component.

Do not extract components prematurely. Three similar JSX blocks are not automatically a
component — evaluate whether the abstraction simplifies or complicates the callsite.

### File and Naming Rules

- One component per file. File name matches the component name exactly (PascalCase).
- Prop interfaces are named `<ComponentName>Props` and defined in the same file, above the component.
- Export the component as a named export. Do not use default exports.

```ts
// Correct
export interface WorkspaceCardProps { ... }
export function WorkspaceCard(props: WorkspaceCardProps) { ... }

// Wrong
export default function WorkspaceCard(...) { ... }
```

### Props

Define all props explicitly — no spreading unknown props onto DOM elements without
an explicit `React.HTMLAttributes` extension in the interface.

Use `children: React.ReactNode` only when the component is a genuine layout wrapper.
Prefer explicit props for everything else.

---

## DO NOT

**Data fetching**
- Never call `fetch()` or `axios` directly inside a component or custom hook. All API calls go through `src/lib/api.ts`.
- Never use `useEffect` to fetch data. Use TanStack Query.
- Never store server state in `useState`. If it came from the server, it lives in the query cache.

**Routing**
- Never edit `src/routeTree.gen.ts` by hand.
- Never use `window.location.href` or `history.push` for in-app navigation.

**Styling**
- Never hardcode colour hex values, RGB values, or named CSS colours in components.
- Never hardcode pixel sizes for spacing, font size, or border radius — use MUI's spacing scale and theme tokens.
- Never use inline `style={{}}` props. Use `sx` or `styled()`.

**TypeScript**
- Never use `any`. Use `unknown` with narrowing, or define the correct type.
- Never use non-null assertions (`!`) without a comment explaining why the value is guaranteed to be non-null.
- Never cast with `as SomeType` to silence a type error. Fix the type.

**Forms**
- Never use uncontrolled inputs or `ref`-based form reading. All forms use TanStack Form.
- Never submit a form by reading DOM values directly.

**Components**
- Never use default exports for components.
- Never define more than one component in a single file (test files excluded).
- Never import from a sibling feature's `components/` or `hooks/` directory. Use the shared `src/components/` or `src/hooks/` instead.
