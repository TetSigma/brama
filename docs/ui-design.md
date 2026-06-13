# Brama UI Design Direction

Brama is an AI assistant for Lublin citizens. Its interface should feel like a modern civic service from Lublin: practical, accessible, trustworthy, and locally grounded without copying protected municipal assets.

## Lublin Identity Sources

- Official visual identity page: [System Identyfikacji Wizualnej](https://lublin.eu/lublin/marketing-miasta/logo-lublinmiasto-inspiracji/system-identyfikacji-wizualnej/)
- Official logo-use rules: [Uzycie logo](https://lublin.eu/lublin/marketing-miasta/logo-lublinmiasto-inspiracji/uzycie-logo/)
- Official origin notes: [Proces powstania SIW](https://lublin.eu/lublin/marketing-miasta/logo-lublinmiasto-inspiracji/proces-powstania-siw/)

The city identity system defines the construction of the Lublin promotional mark, accepted variants, composition patterns, colors, and typography. The identity is based around the "Lublin. Miasto Inspiracji" mark, strong black and white applications, red and green "L" elements, and architecture-inspired symbolism such as arches, gates, towers, vaults, and fortification plans.

Important constraint: the official "Lublin. Miasto Inspiracji" logo is a registered mark and each use requires consultation with the city marketing office. Brama should therefore be Lublin-inspired rather than logo-dependent unless explicit permission is obtained.

## Design Principles

- Civic clarity first: make every screen easy to scan, with visible actions and plain language.
- Lublin-coded, not logo-heavy: use the city's color logic, architectural rhythm, and gate motif without relying on protected marks.
- Accessible by default: support high contrast, visible focus states, readable text, and stable layouts on mobile and desktop.
- Multilingual readiness: design content and controls with Polish, English, and Ukrainian strings in mind.
- Assistant as public utility: the experience should feel calm, reliable, and procedural when helping with offices, transport, services, and city information.

## Visual Language

Use a black and white civic base with red and green as primary identity anchors. Secondary colors should be used sparingly for categories, statuses, and data visualization.

```css
:root {
  --lublin-red: #fa1414;
  --lublin-green: #73be46;
  --lublin-black: #000000;
  --lublin-white: #ffffff;

  --lublin-orange: #ff8228;
  --lublin-plum: #7b1e59;
  --lublin-blue: #0069b4;
  --lublin-magenta: #c3005a;
  --lublin-teal: #00b194;
  --lublin-cyan: #00c3e6;

  --surface: #ffffff;
  --surface-muted: #f4f4f4;
  --text: #111111;
  --text-muted: #555555;
  --border: #d8d8d8;
}
```

### Color Use

- Use black text on white for core reading surfaces.
- Use red for primary civic emphasis, urgent notices, active route markers, or critical status.
- Use green for successful completion, eligibility, availability, and helpful next steps.
- Use blue, teal, cyan, orange, plum, and magenta as restrained category colors.
- Do not create a one-note red/green interface; keep the main app neutral and let colors carry meaning.

### Typography

The official identity uses Klavika as the primary brand family and Arial CE as a system substitute. For Brama, use a clean system sans stack unless Klavika is licensed for the project.

Recommended stack:

```css
font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
```

Keep headings compact and utilitarian. Reserve large type for the main assistant entry point, not routine cards or panels.

## Motifs And Components

### Brama Motif

"Brama" should lean into the gate/arch idea found in Lublin's identity language. Good patterns:

- Arch-like framing around the main chat entry area.
- L-shaped corner accents on important panels.
- Two-color red/green edge markers for primary assistant states.
- Subtle geometric patterns inspired by architectural details, used only as low-contrast texture.

Avoid literal use of the official city logo, coat of arms, or copied brand-book layouts unless permission is granted.

### Assistant Interface

- The first screen should be the usable assistant, not a marketing landing page.
- Suggested prompts should focus on citizen tasks: documents, appointments, transport, waste collection, air quality, local events, benefits, and office procedures.
- Answers should support source links and "next action" buttons when the user can do something concrete.
- Error states should explain whether the assistant lacks data, the service is unavailable, or the user needs an official office channel.

### Accessibility Details

- Provide visible keyboard focus for all controls.
- Use semantic buttons for actions and links for navigation.
- Keep chat input labels accessible even when visually compact.
- Reserve layout space for loading and streaming states.
- Test mobile widths for long Polish and Ukrainian words.
- Consider high-contrast mode as a first-class visual variant, not an afterthought.

## Product Tone

Brama should sound helpful, direct, and locally aware. It should avoid overclaiming official authority unless the product is formally operated by the city. When a topic requires official confirmation, the UI should guide users to the relevant office, form, or source.

## Implementation Notes

- Put reusable UI pieces under the app's shared component area once it exists.
- Prefer CSS variables for colors, spacing, and radii.
- Keep remote city data access in domain hooks or service modules, routed through TanStack Query.
- Validate city-service API responses, URL params, and browser storage inputs before rendering.
- Browser QA should include at least one desktop and one mobile viewport after meaningful UI changes.
