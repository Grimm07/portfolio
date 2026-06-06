---
name: new-component
description: Scaffold a new React section/component for this portfolio that matches the repo's exact house style (functional component, named export, props interface, Tailwind theme tokens, a11y). Use when the user runs /new-component <ComponentName> or asks to add a new portfolio section/component to the page so it doesn't drift from conventions.
disable-model-invocation: true
---

# new-component

Scaffold a new React component under `src/components/` that matches THIS repo's conventions, then
offer to wire it into the page and add a test. Invoked as `/new-component <ComponentName>`.

The user passes a `<ComponentName>` argument (e.g. `/new-component Testimonials`). Use it verbatim as
the component name — it must be PascalCase. The file is `src/components/<ComponentName>.tsx` and the
export is `export function <ComponentName>`.

## Coordinator note

This repo follows a COORDINATOR + specialist model (see `CLAUDE.md`). For any repo-specific UI idiom
beyond this template — exact theme-token choices, glass-card variants, dark-mode behavior, App.tsx
composition order — defer to the `frontend-component-expert` project agent rather than guessing.

## House conventions (from `CLAUDE.md` "Code style" + real components)

- **Functional components only.** No classes.
- **Named exports** — `export function <Name>()`. Never `export default`.
- **Props interface ALWAYS defined** — even if currently empty-ish. Name it `<Name>Props`. Many
  sections take no props today (see `About`, `Skills`, `Footer`), but define and accept the interface
  so the seam exists; if there are genuinely no props, you may still declare the interface and accept
  `{}: <Name>Props` is overkill — instead define the interface and only destructure if used. Keep it
  present and typed.
- **Import order:** React → external packages → local components → types. Omit groups you don't use.
  (`Skills.tsx` imports `react` then the local `./SkillModal`.)
- **Tailwind utilities only.** Avoid custom CSS. Use the repo's real theme tokens (below).
- **Strict TypeScript** (`noUnusedLocals`, `noUnusedParameters`) — don't leave unused imports,
  params, or locals; type check must pass clean.
- **Semantic HTML + a11y** — each section is a `<section id="...">` with a single `<h2>`; interactive
  controls get `aria-label`s and visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).

## Real Tailwind theme tokens (from `tailwind.config.js` — use these, don't invent)

Colors:
- `primary` (+ `primary-dark`, `primary-light`) — blue accent, used for headings/links/tags.
- `secondary` (+ `secondary-dark`, `secondary-light`) — violet accent.
- `success` (+ `success-dark`, `success-light`).
- `bg-primary`, `bg-secondary`, `bg-tertiary` — surface backgrounds (CSS vars, dark-mode aware).
- `text-primary`, `text-secondary`, `text-tertiary` — body text (CSS vars).
- `border-default` — border color (CSS var).

Common composed utilities seen in real components:
- Section shell: `py-20 lg:py-32 bg-bg-secondary relative overflow-hidden`
- Inner container: `max-w-7xl mx-auto px-6 relative z-10`
- Heading: `text-4xl font-bold mb-12`
- Glass card: `glass-card-sm p-6` (a repo utility class — fine to reuse).
- Tag chip: `px-3 py-1 bg-primary/20 text-primary rounded-full text-sm` (or `bg-secondary/20 text-secondary`).
- Decorative gradient orbs: `absolute ... bg-primary/10 rounded-full blur-3xl` inside a
  `pointer-events-none` layer.

`darkMode` is `'class'` — don't hardcode light/dark colors; the `bg-*`/`text-*` CSS-var tokens already
switch with the theme.

## Security hard-rule (from `CLAUDE.md` — CRITICAL)

NEVER put any of these in the component (a Lefthook secrets check will block the commit, and it's a
hard project rule):
- Email addresses (no `mailto:`, no plaintext).
- Phone numbers (any format).
- API keys / secrets.

Contact is form-only; the only allowed direct-contact affordances are the LinkedIn / GitHub / GitLab
profile links. Do not add new contact affordances in a scaffolded component.

## Steps

1. **Create `src/components/<Name>.tsx`** from the template below, substituting `<Name>`.
2. **Follow every house convention above** — named export, `<Name>Props` interface present, import
   order, Tailwind tokens only, semantic `<section>` with one `<h2>`, focus-visible rings on any
   interactive element. No emails/phones/secrets.
3. **Offer to wire it into `src/App.tsx`.** Components are imported at the top and rendered inside
   `<main id="main-content">` in visual order (`Hero, About, Experience, Patents, Skills, Projects,
   Contact`, then `<Footer />` outside `<main>`). Ask the user where in that order the new section
   should go, add the import (keeping the existing import grouping), and render `<Name />` in the
   chosen spot. Don't wire it in without confirming placement.
4. **Suggest a matching test** at `src/components/__tests__/<Name>.test.tsx`. The repo uses Vitest +
   `@testing-library/react` (+ `userEvent` for interactions); tests assert the section renders
   (`document.getElementById('<id>')`), key text is present, and controls expose their `aria-label`.
   Offer to delegate writing it to the `test-coverage-writer` agent, mirroring the style of
   `src/components/__tests__/Hero.test.tsx`.
5. **Type-check** with `npx tsc --noEmit` and report the result. Fix any strict-mode violations
   (unused imports/params/locals) before finishing.

## Template

```tsx
// Import order: React → external packages → local components → types.
// (Only include the React import if you actually use hooks/JSX helpers — strict mode flags unused imports.)

export interface <Name>Props {
  // No props yet — keep the interface present so the seam exists.
  // Add typed props here as the section grows.
}

export function <Name>(_props: <Name>Props = {}) {
  return (
    <section id="<id>" className="py-20 lg:py-32 bg-bg-secondary relative overflow-hidden">
      {/* Decorative background gradient orbs (purely visual) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-12"><Name></h2>

        <div className="glass-card-sm p-6">
          <p className="text-lg text-text-primary leading-relaxed">
            Replace with real content. Use text-text-primary / text-text-secondary /
            text-text-tertiary for copy, and text-primary / text-secondary for accents.
          </p>
        </div>
      </div>
    </section>
  );
}
```

Notes on the template:
- `<id>` is a lowercase slug of the component name (e.g. `Testimonials` → `id="testimonials"`),
  matching the existing sections (`about`, `skills`, etc.) so in-page anchor scrolling works.
- If the section takes no props, you can drop the `_props` parameter entirely and write
  `export function <Name>()` — but still define and export the `<Name>Props` interface for the seam.
  If you keep the parameter unused, prefix it with `_` so `noUnusedParameters` stays happy.
- For interactive variants (buttons/cards), mirror `Skills.tsx`: `type="button"`, an `aria-label`,
  and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
  focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary`.
- Reuse `glass-card-sm` and the chip utilities rather than inventing new CSS.
