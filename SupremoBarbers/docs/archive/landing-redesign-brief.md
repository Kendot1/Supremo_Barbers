# Goal: Redesign the Barbershop Landing Page with Premium UI/UX

Act as a senior UI/UX designer, creative director, frontend engineer, and branding specialist with experience designing premium barbershop and grooming websites.

## Primary Objective

Completely redesign the existing landing page for **Supremo Barber**, a barbershop business that provides haircut and grooming services to customers.

Create an aesthetically pleasing, modern, distinctive, and professional landing page that reflects the identity of a real barbershop while making it easy for customers to explore services and book appointments.

The design must prioritize the client's business objectives:

1. Attract potential customers.
2. Showcase the barbershop's haircut and grooming services.
3. Establish credibility and customer trust.
4. Communicate quality, professionalism, and personal style.
5. Encourage customers to book appointments.
6. Provide a smooth and convenient customer experience.

The website should feel like a carefully art-directed barbershop brand, not a generic SaaS platform or appointment management dashboard.

## 1. Visual Identity and Creative Direction

Develop a sophisticated visual direction inspired by premium barbershop branding, contemporary men's grooming, and modern editorial design.

Emphasize:

- Strong, expressive typography
- Premium, cohesive color combinations
- Beautifully composed haircut and barbershop imagery
- Clean and intentional whitespace
- Bold but balanced layouts
- Elegant visual hierarchy
- Refined buttons and interactive elements
- Subtle texture and visual depth
- Smooth, purposeful animations
- Professional and memorable branding

Consider a warm, premium palette using charcoal, cream, warm neutrals, and a restrained accent color, but evaluate the client's existing branding before choosing final colors.

Explore three distinctive visual concepts and implement the strongest based on aesthetic quality, brand alignment, usability, and responsiveness.

Avoid generic templates, excessive gradients, unnecessary glassmorphism, cluttered sections, and repetitive card layouts.

The final design should convey confidence, craftsmanship, precision, and quality.

## 2. Landing Page Structure

Inspect the existing landing page and available business information before redesigning.

Improve the following sections where applicable.

### Navigation

Create a clean, elegant, responsive navigation bar.

Make essential destinations easy to access, especially:

- Home
- Services
- Barbers
- About
- Book Appointment

Use the application's actual available routes and features. Do not create broken navigation destinations.

Make the booking action visually prominent.

### Hero Section

Design a visually striking hero that immediately communicates the barbershop's identity and services.

Use:

- A compelling headline related to style, confidence, and quality haircuts
- Concise supporting text
- A prominent "Book Appointment" button
- A secondary action such as "Explore Services"
- High-quality barbershop or haircut imagery
- Creative but readable typography
- A distinctive visual composition

The hero should create a strong first impression and make the next action obvious.

Avoid generic marketing language and overly long paragraphs.

### Services Section

Present the barbershop's actual haircut and grooming services in an attractive, organized layout.

Display service names, descriptions, durations, and prices only when available from existing data.

Make the services easy to compare and understand.

Avoid inventing services or pricing.

### Barbers Section

If barber profiles exist, introduce the barbers through professionally designed profile presentations.

Highlight their names, available specializations, and relevant information.

Do not fabricate credentials, years of experience, or customer ratings.

### About the Barbershop

Create a visually engaging section introducing the business, its values, and its commitment to customer satisfaction.

Use authentic information from the existing project.

Emphasize craftsmanship, attention to detail, and customer experience without inventing historical claims.

### Booking Call-to-Action

Create a compelling booking section that encourages customers to schedule their next haircut.

Make the booking process feel convenient, reliable, and straightforward.

Connect the CTA to the existing appointment booking flow.

Do not modify the booking rules or backend functionality.

### Footer

Create a cohesive footer containing verified business information, relevant navigation links, and available contact details.

Do not invent addresses, operating hours, or social media accounts.

## 3. Tailwind CSS Implementation

Use Tailwind CSS as the primary styling framework.

- Follow the installed Tailwind version's best practices.
- Establish consistent colors, typography, spacing, and design tokens.
- Create reusable components where appropriate.
- Use responsive utilities for mobile, tablet, and desktop layouts.
- Avoid duplicated styles and excessive arbitrary values.
- Use custom CSS only for specialized visual requirements.
- Maintain readable and maintainable component code.

Ensure every section follows one cohesive visual language.

## 4. Animations and Microinteractions

Implement subtle, premium animations that complement the barbershop's identity.

Consider:

- Elegant hero entrance animations
- Smooth image reveals
- Refined hover effects
- Subtle button interactions
- Purposeful scroll transitions
- Polished mobile navigation

Use existing animation libraries where possible.

Keep animations smooth and lightweight.

Respect reduced-motion preferences.

Avoid unnecessary movement and distracting visual effects.

## 5. Customer Experience and Conversion

Prioritize the customer's journey from discovering the barbershop to booking an appointment.

Ensure visitors can quickly understand:

1. What the barbershop offers.
2. What services are available.
3. Who provides the services, when profiles exist.
4. How to schedule an appointment.
5. How to contact or locate the business using verified details.

Reduce unnecessary steps between the landing page and the booking process.

Make booking actions prominent without overwhelming the design.

The goal is not only aesthetic quality but also an intuitive experience that encourages legitimate bookings.

## 6. Responsive Design and Accessibility

Create a mobile-first experience that looks polished across all screen sizes.

Optimize navigation, typography, imagery, spacing, and CTA placement for phones, tablets, and desktops.

Use semantic HTML, accessible buttons, visible keyboard focus, appropriate color contrast, and reduced-motion support.

Target WCAG 2.2 AA where applicable.

Avoid horizontal scrolling, clipped text, overlapping sections, and inaccessible interactions.

## 7. Preserve Existing System Functionality

**Scope: Public landing page redesign only.**

You may redesign the landing page's layout, typography, colors, imagery, components, and animations.

However:

- Preserve the existing appointment booking functionality.
- Do not modify customer, barber, or administrator dashboards.
- Do not change authentication or authorization.
- Do not modify Supabase tables, policies, or database schemas.
- Do not change booking, cancellation, or rescheduling rules.
- Do not modify payment verification logic.
- Do not break existing routes or navigation.
- Do not remove legitimate business information.
- Do not introduce unrelated features.

Shared components may be modified only when necessary, and any effects on other pages must be checked.

## 8. Performance and Code Quality

Optimize:

- Image loading and compression
- Font loading
- Initial page rendering
- Animation performance
- Responsive layout stability
- Component reuse
- JavaScript bundle size

Use the existing framework's optimization features where appropriate.

Avoid unnecessary dependencies.

Keep the implementation secure, maintainable, and compatible with the existing application architecture.

## 9. Mandatory Implementation Workflow

**Phase 1: Inspect**

Read applicable `AGENTS.md` instructions and inspect the existing landing page, assets, branding, navigation, and business data.

**Phase 2: Design**

Identify visual weaknesses and explore three original, barbershop-appropriate design directions.

Choose the strongest concept.

**Phase 3: Implement**

Redesign the landing page directly using Tailwind CSS and existing project technologies.

**Phase 4: Refine**

Improve typography, layout composition, color harmony, imagery, spacing, animations, and CTA visibility.

**Phase 5: Validate**

Inspect the rendered landing page on desktop and mobile when browser tools are available.

Run TypeScript checks, linting, and the production build.

Verify that navigation and booking CTAs work correctly.

**Phase 6: Final Review**

Review changed files for UI regressions, broken functionality, unnecessary modifications, and accessibility problems.

Fix confirmed issues.

## 10. Completion Criteria

The redesign is complete when:

1. The landing page clearly represents a professional barbershop business.
2. The visual design feels premium, original, and aesthetically pleasing.
3. The hero creates a memorable first impression.
4. Haircut and grooming services are presented clearly.
5. Customers can easily find and use the booking action.
6. The design works beautifully on mobile and desktop.
7. Tailwind CSS is used consistently.
8. Existing appointment functionality remains intact.
9. Relevant checks and production builds succeed.
10. No unrelated application functionality has been modified.

## Final Instructions

Do not stop after producing a design proposal.

Implement the redesign directly in the existing codebase.

Prioritize aesthetic excellence, brand identity, customer trust, booking convenience, accessibility, and performance.

Use relevant installed frontend design and UI/UX skills when available.

Minimize unnecessary token usage and unrelated changes.

At completion, provide a concise summary of the redesign, modified files, validation results, and remaining limitations.

**Ultimate Goal:** Transform Supremo Barber's landing page into a beautiful, premium, modern barbershop website that showcases the client's haircut services, builds customer confidence, and encourages visitors to book their next appointment.