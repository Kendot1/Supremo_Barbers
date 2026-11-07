# Mission: Complete UI/UX Refinement Using Professional Design Skills

## Repository skill activation

The project-scoped skills are installed as real copies under `.hermes/skills/` (not global installations):

- `redesign-existing-projects/SKILL.md`: read before auditing or modifying an existing screen; preserve working product structure and business logic.
- `design-taste-frontend/SKILL.md`: read before implementing frontend presentation; apply deliberate hierarchy, responsive layouts, and complete interaction states.
- `minimalist-ui/SKILL.md`: read alongside the design skill; favor restrained surfaces, typography, and functional spacing over decoration.
- `web-design-guidelines/SKILL.md`: read for validation and final review; fetch its referenced current guidelines and check keyboard access, labels, contrast, motion, and responsiveness.

Read these files directly when the active agent cannot discover repository-local skills automatically. Verify with `npx skills list` and filesystem inspection. `skills-lock.json` records installation sources. The original `jeettrench/taste-skill` URL is inaccessible; its requested skills are available from `https://github.com/tasteskill/tasteskill`. Use `--agent hermes-agent --copy -y` for project-scoped, noninteractive Windows installation.

Project requirements take precedence over conflicting generic skill suggestions: retain Supremo's real brand, assets, installed icon library, and data. Do not fabricate records, replace the framework, add perpetual decorative motion, or redesign working flows merely to follow an example aesthetic.

You are acting as a Senior UI/UX Designer, Frontend Engineer, and Design Quality Reviewer.

Your mission is to inspect and improve the existing system's frontend until it delivers a clean, cohesive, professional, production-ready experience that feels intentionally designed by an experienced human designer rather than generated from a generic AI template.

**Do not merely recommend design changes. Implement them directly in the existing repository.**

## Phase 1 — Install and Activate Agent Skills

Before modifying frontend code, inspect the repository, existing agent configuration, and installed skills.

Install the following skills using the Agent Skills CLI:

**1. Redesign Existing Projects**
```bash
npx skills add https://github.com/jeettrench/taste-skill --skill redesign-existing-projects
```

**2. Anti-AI-Slop Frontend Design**
```bash
npx skills add https://github.com/jeettrench/taste-skill --skill design-taste-frontend
```

**3. Minimalist UI Design**
```bash
npx skills add https://github.com/jeettrench/taste-skill --skill minimalist-ui
```

**4. Web Design Guidelines**
```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

Installation requirements:

- Install in the repository's project scope, not globally.
- Select the current coding agent when prompted.
- Inspect skill sources and instructions before executing any bundled scripts.
- Confirm each skill has a valid `SKILL.md` file.
- Verify installation using `npx skills list` and filesystem inspection.
- Ensure the skills are accessible to the active agent.
- Ensure the skill files are retained in the repository and are not accidentally ignored by Git.
- If Windows symlinks are unsupported, use the CLI's copy installation option.
- Update the existing `AGENTS.md`, if present, or create it when appropriate, to explain when these skills must be activated.
- Preserve all existing agent instructions and project rules.
- Actually read and apply the installed skills before implementing changes.

Do not claim any skill was installed unless verified.

If installation fails, diagnose and resolve the issue rather than silently substituting generic design instructions.

## Phase 2 — Audit the Existing System

Inspect the entire frontend before making modifications.

Identify:

- Current framework and styling approach
- Existing pages, routes, layouts, and components
- Global styles and theme configuration
- Typography, colors, spacing, and layout inconsistencies
- Navigation and information architecture
- Redundant UI elements and visual clutter
- Poor responsiveness or mobile overflow
- Inconsistent buttons, forms, tables, charts, and cards
- Accessibility and usability issues
- Repeated generic AI-generated design patterns

Use `redesign-existing-projects` to guide the audit.

Preserve existing product identity and important visual conventions where they already work.

Prioritize fixing actual problems rather than redesigning functional interfaces unnecessarily.

## Phase 3 — Apply Anti-AI-Slop Design

Activate `design-taste-frontend` and `minimalist-ui`.

The objective is a refined interface with a deliberate visual identity.

Eliminate unnecessary patterns such as:

- Excessive gradients and decorative glows
- Overused glassmorphism
- Random purple or blue gradient themes
- Too many nested cards and containers
- Excessively rounded components
- Oversized headings with weak visual hierarchy
- Unnecessary shadows and animations
- Generic SaaS template layouts
- Decorative elements without meaningful purpose
- Repetitive AI-generated marketing copy
- Inconsistent spacing and alignment

Do not ban visual techniques simply because they are common. Use them only when appropriate to the project's purpose and design language.

Aim for:

- Carefully structured layouts
- Clear and readable typography
- Balanced whitespace
- Consistent visual rhythm
- Restrained, purposeful colors
- Strong information hierarchy
- Subtle, functional interactions
- Clean navigation
- Cohesive component design
- A professional, human-crafted appearance

The final interface should feel polished, sophisticated, and natural, without becoming overly decorative.

## Phase 4 — Establish a Consistent Design System

Create or refine the existing design system.

Standardize:

1. **Typography:** Font families, type scale, weights, and line heights.
2. **Spacing:** Consistent spacing tokens and layout gaps.
3. **Colors:** Primary, secondary, neutral, surface, border, and semantic colors.
4. **Components:** Buttons, inputs, cards, tables, modals, navigation, and feedback states.
5. **Borders and shadows:** Consistent use of radius, borders, and elevation.
6. **Responsive layouts:** Mobile, tablet, and desktop behavior.
7. **Accessibility:** Keyboard navigation, focus indicators, contrast, and semantic markup.
8. **Interactions:** Predictable hover, active, loading, empty, error, and success states.

Reuse the existing component architecture wherever reasonable.

Avoid introducing unnecessary dependencies or a complete UI framework replacement.

For data-heavy pages, prioritize readable information, appropriate density, and clear charts or tables rather than decorative dashboard elements.

## Phase 5 — Implement the Redesign

Apply improvements directly to the existing frontend.

Work through the relevant routes, shared layouts, and components.

Requirements:

- Maintain all existing features and business logic.
- Preserve APIs, database connections, authentication, and data flows.
- Do not alter forecasting, computation, or backend behavior as part of visual cleanup.
- Do not introduce fake data or placeholder functionality.
- Refactor duplicated UI code when beneficial.
- Improve visual consistency across pages.
- Make navigation intuitive.
- Remove unnecessary visual clutter.
- Keep the interface responsive and accessible.
- Ensure the UI remains easy to maintain.

Use the existing technology stack and project conventions.

The goal is not merely attractive screenshots. Deliver fully functional, polished application interfaces.

## Phase 6 — Validate Design Quality

Activate `web-design-guidelines` and review the implemented changes.

Run the relevant available project checks, including:

- Type checking
- Linting
- Production build
- Existing automated tests
- Responsive layout checks
- Accessibility checks

When browser preview or screenshot tooling is available, inspect the actual rendered application at desktop, tablet, and mobile sizes.

Compare before and after screenshots where possible.

Review each affected screen for:

- Layout correctness
- Consistent spacing and typography
- Text readability
- Color contrast
- Responsive behavior
- Component alignment
- Interaction correctness
- Visual clutter
- Remaining generic AI-style patterns

Fix identified issues and validate again.

Do not declare success solely because the build passes.

## Phase 7 — Independent Design Review

Perform a final reviewer pass separate from the implementation assessment.

The reviewer must determine whether the design genuinely feels intentional, cohesive, accessible, and professionally maintained.

If critical problems remain, revise the implementation and review it again.

Do not treat minor subjective differences as unlimited redesign work. Prioritize concrete problems and stop when the acceptance criteria are met.

## Acceptance Criteria

The task is complete only when:

- All four skills are installed and verified in the repository.
- `AGENTS.md` documents how the skills are used.
- Existing functionality is preserved.
- Relevant pages follow a consistent design system.
- The UI is clean, responsive, accessible, and professional.
- Generic AI-generated design patterns have been reduced or eliminated where inappropriate.
- No major visual regressions remain.
- Available build, lint, and test checks pass, or any pre-existing failures are clearly documented.
- The actual frontend has been improved, not just described.

## Final Report

Provide:

1. Installed skills, their repository paths, and verification results.
2. Summary of major design problems discovered.
3. Pages and components improved.
4. Design system changes.
5. Anti-AI-slop improvements.
6. Responsive and accessibility validation results.
7. Build, test, and lint results.
8. Any remaining limitations.
9. Before-and-after screenshots, if available.

**Final instruction:** Execute the redesign in the repository. Prioritize thoughtful design decisions over template-like aesthetics. Do not stop after installing the skills or producing an audit. Complete and verify the frontend improvements while preserving application functionality.