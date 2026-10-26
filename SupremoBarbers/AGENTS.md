# MASTER GOAL: Complete Role-Based UI/UX and User Flow Redesign for Supremo Barber

## Role and Objective

Act as a senior UI/UX designer, product designer, UX researcher, software architect, full-stack engineer, and QA specialist.

Your mission is to completely redesign and improve the Customer, Barber, and Admin experiences of Supremo Barber, a barbershop appointment booking and management system.

This is not a simple visual refresh.

**You are authorized to redesign the overall interface, navigation architecture, page layouts, user journeys, interaction patterns, and workflow structure.**

The objective is to create a visually exceptional, modern, intuitive, efficient, and professionally designed system that reflects the needs of a real barbershop business.

Use the existing codebase and actual business requirements as the foundation.

Read `AGENTS.md` and inspect the current implementation before making changes.

## 1. Core Goals

1. Completely redesign the Customer, Barber, and Admin interfaces.
2. Reevaluate and improve the user journey for each role.
3. Simplify complicated workflows and remove unnecessary steps.
4. Improve navigation, information architecture, and screen organization.
5. Establish a cohesive, aesthetically pleasing design system.
6. Improve booking, appointment management, and administrative operations.
7. Ensure that all role-based workflows remain properly connected.
8. Fix confirmed usability issues and workflow inconsistencies.
9. Improve responsiveness, accessibility, and performance.
10. Maintain database integrity, security, and critical business requirements.

Do not preserve inefficient workflows merely because they already exist.

However, distinguish between interface flow changes and business policy changes. You may restructure how users complete tasks, but do not silently change booking restrictions, payment requirements, permissions, or other contractual business rules.

## 2. Audit the Current User Experience

Analyze every existing page, route, component, and important interaction.

For each role, identify:

- Confusing navigation
- Unnecessary clicks
- Redundant screens
- Excessive form fields
- Poor visual hierarchy
- Inconsistent layouts
- Difficult-to-find actions
- Missing feedback
- Broken workflow transitions
- Unclear appointment statuses
- Inconsistent terminology
- Mobile usability problems
- Incomplete error and empty states

Map the current user journeys and identify opportunities for meaningful improvements.

Do not assume the existing page structure is optimal.

## 3. Customer Experience Redesign

Redesign the customer interface around one primary objective:

**Make booking and managing a haircut appointment effortless.**

### Proposed Customer Journey

Discover Services → Select Service → Choose Barber → Select Date and Time → Review Booking → Confirm Appointment → Manage Appointment

Adapt this sequence to the application's actual business rules and available features.

### Customer UI Requirements

Redesign:

- Customer dashboard
- Service browsing
- Barber selection
- Appointment booking
- Appointment confirmation
- Upcoming appointments
- Appointment history
- Rescheduling
- Cancellation
- Profile management
- Payment interfaces where applicable
- Feedback and ratings

### UX Improvements

Create a guided booking experience with:

- Clear step progression
- Visible service information
- Easy barber selection
- Intuitive date and time selection
- Real-time availability where supported
- Clear pricing and duration information
- Booking summary before confirmation
- Helpful validation messages
- Confirmation and next-step guidance

Reduce unnecessary page transitions and repeated data entry.

Make upcoming appointments immediately visible.

Place important actions such as rescheduling and cancellation where customers can easily find them.

Show unavailable actions with clear explanations rather than confusing or silent failures.

Ensure customers can complete their primary tasks comfortably on mobile.

## 4. Barber Experience Redesign

Redesign the barber interface around daily operations and schedule management.

**Primary objective: Help barbers understand their workload and manage appointments efficiently.**

### Proposed Barber Journey

Login → View Today's Schedule → Review Appointment Details → Manage Appointment Status → Update Availability → Review Upcoming Appointments

### Barber UI Requirements

Redesign:

- Barber dashboard
- Daily schedule
- Weekly calendar
- Assigned appointments
- Appointment details
- Availability management
- Appointment status controls
- Appointment history
- Profile and account settings

### UX Improvements

Make the dashboard immediately communicate:

- Today's appointments
- Next scheduled customer
- Upcoming bookings
- Available time slots
- Relevant appointment statuses
- Actions requiring attention

Use an intuitive calendar or timeline where appropriate.

Allow barbers to manage schedules without navigating through unnecessary screens.

Make appointment actions clear and accessible.

Use consistent status labels and visual indicators.

Prevent confusing or unauthorized actions.

Prioritize practical usability during busy working hours.

## 5. Admin Experience Redesign

Redesign the Admin interface around operational control and business visibility.

**Primary objective: Help administrators manage the barbershop efficiently with minimal confusion.**

### Proposed Admin Journey

Login → Business Overview → Review Pending Actions → Manage Appointments → Manage Services and Barbers → Review Payments → Analyze Business Performance

### Admin UI Requirements

Redesign:

- Admin dashboard
- Appointment management
- Calendar and scheduling
- Service management
- Barber management
- Customer management
- Payment verification
- Feedback management
- Reports and analytics
- Settings and administrative controls

### UX Improvements

Create a clean and efficient management interface.

Prioritize:

- Today's appointments
- Pending actions
- Booking activity
- Payment verification tasks
- Barber availability
- Service management
- Business analytics

Use meaningful dashboard summaries rather than excessive decorative cards.

Provide efficient filtering, searching, sorting, and pagination where appropriate.

Use clear forms, confirmation dialogs, and contextual actions.

Reduce unnecessary navigation between related management tasks.

Design administrative tables and dashboards to work on smaller screens without losing essential functionality.

## 6. Redesign Navigation and Information Architecture

You may reorganize existing pages and navigation structures.

Create role-specific navigation that reflects the actual responsibilities of each user.

Customer navigation should prioritize booking and appointment management.

Barber navigation should prioritize schedules and assigned appointments.

Admin navigation should prioritize operational management and reporting.

Improve:

- Sidebar structure
- Top navigation
- Breadcrumbs
- Page hierarchy
- Active navigation states
- Mobile menus
- Contextual actions
- Route organization

Avoid overcrowded navigation.

Group related functionality logically.

If routes change, update all internal links, redirects, and relevant tests.

Preserve existing external links or provide appropriate redirects where needed.

## 7. Complete Visual Design Transformation

Create a cohesive, premium, aesthetically pleasing visual identity inspired by modern barbershop branding.

The interface should feel sophisticated, professional, contemporary, and trustworthy.

### Visual Priorities

- Strong typography
- Harmonious color palette
- Elegant spacing
- Refined cards and surfaces
- Clear information hierarchy
- Professional iconography
- Attractive calendars
- Modern form controls
- Polished tables
- Purposeful microinteractions
- Smooth page transitions
- Consistent feedback states

Explore three distinct design directions internally.

Select the strongest based on aesthetic quality, business alignment, usability, and implementation feasibility.

Use one consistent brand identity across all roles while allowing role-specific layouts.

Avoid generic admin dashboard templates, excessive gradients, unnecessary glassmorphism, and cluttered designs.

## 8. Mandatory Tailwind CSS

Use Tailwind CSS as the primary styling framework.

Inspect the installed version and follow its conventions.

Establish a shared design system with:

- Brand colors
- Typography scales
- Spacing tokens
- Responsive breakpoints
- Layout containers
- Component variants
- Status colors
- Border radii
- Shadows
- Motion settings

Build reusable components for buttons, forms, navigation, tables, modals, cards, calendars, and feedback states.

Avoid unnecessary styling duplication and conflicting CSS.

Use custom CSS only when Tailwind cannot express a requirement cleanly.

## 9. Workflow and Business Logic Alignment

After redesigning the user journeys, ensure the new interfaces correctly connect to existing backend functionality.

Validate the complete flow:

User Action → Validation → Authorization → Database Operation → Response → UI Update → Related Role Updates

Check:

- Booking creation
- Barber assignment
- Schedule availability
- Appointment confirmation
- Rescheduling
- Cancellation
- Payment verification
- Appointment completion
- Customer feedback
- Dashboard updates

Ensure that workflow changes do not introduce:

- Double bookings
- Invalid appointments
- Duplicate submissions
- Incorrect status transitions
- Unauthorized actions
- Stale schedules
- Data inconsistencies
- Broken notifications

Enforce critical rules on the server and database where appropriate.

If a proposed UX improvement requires changing a business policy, document the proposed change and request approval before implementing it.

## 10. Responsive and Accessible Design

Design mobile-first.

Ensure all Customer, Barber, and Admin interfaces work across phones, tablets, laptops, and desktops.

Optimize booking calendars, dashboards, forms, navigation, and tables for smaller screens.

Target WCAG 2.2 AA where applicable.

Support:

- Keyboard navigation
- Visible focus states
- Accessible labels
- Appropriate color contrast
- Semantic HTML
- Reduced-motion preferences
- Clear validation feedback
- Readable text scaling

## 11. Security and Reliability

Maintain existing authentication, authorization, and Supabase Row Level Security protections.

Do not weaken permissions during the redesign.

Verify that each role accesses only authorized records and operations.

Handle loading, empty, success, and error states consistently.

Fix confirmed runtime errors, broken routes, missing imports, and state synchronization problems.

Do not expose private customer information or credentials.

Never perform destructive database operations without explicit authorization.

## 12. Implementation Strategy

### Phase 1: System and UX Audit

Inspect the entire application and document the current role-based navigation, screens, and user journeys.

Identify the biggest usability problems and workflow bottlenecks.

### Phase 2: UX Architecture Redesign

Design improved user journeys for Customer, Barber, and Admin.

Define the new navigation structure, page hierarchy, and interaction patterns.

Identify which existing pages should be consolidated, reorganized, or redesigned.

### Phase 3: Visual Design System

Establish the new visual identity using Tailwind CSS.

Create reusable components and consistent interaction patterns.

### Phase 4: Customer Implementation

Implement the redesigned Customer experience and validate booking-related workflows.

### Phase 5: Barber Implementation

Implement the redesigned Barber experience and validate schedule and appointment management.

### Phase 6: Admin Implementation

Implement the redesigned Admin experience and validate operational workflows.

### Phase 7: Cross-Role Integration

Verify that all redesigned workflows remain connected.

Test appointment creation, changes, cancellations, payment states, and related dashboard updates across roles.

### Phase 8: Final UI/UX Refinement

Inspect rendered interfaces using browser tools where available.

Improve visual hierarchy, spacing, typography, responsiveness, accessibility, and interaction feedback.

### Phase 9: Quality Assurance

Run relevant:

- TypeScript checks
- Linting
- Unit tests
- Integration tests
- End-to-end workflow tests
- Role authorization tests
- Production build checks

Fix confirmed failures and regressions.

## 13. Change Management and Constraints

You are authorized to substantially redesign the interface and restructure user flows.

You may:

- Reorganize pages
- Redesign dashboards
- Change navigation patterns
- Consolidate redundant screens
- Improve booking steps
- Simplify forms
- Refactor UI components
- Improve state handling
- Modify frontend workflow orchestration
- Update supporting code required by approved flow changes

Do not:

- Delete production data
- Change booking policies without approval
- Weaken authentication or authorization
- Remove essential business features
- Invent services or pricing
- Break existing integrations
- Introduce unrelated functionality
- Perform destructive migrations
- Deploy without authorization

Prefer incremental, testable changes over uncontrolled rewrites.

Use relevant installed design and engineering skills when available.

Minimize unnecessary token usage and repeated work.

## 14. Completion Criteria

The goal is complete when:

1. Customer, Barber, and Admin interfaces have been comprehensively redesigned.
2. Each role has a clear, efficient, and intuitive user journey.
3. Navigation and page hierarchy are logically organized.
4. The visual design is cohesive, premium, and aesthetically pleasing.
5. Tailwind CSS is consistently implemented.
6. Booking and management workflows remain fully integrated.
7. Critical business rules are preserved.
8. Role-based security remains enforced.
9. Responsive and accessibility requirements are addressed.
10. Relevant automated tests and production builds pass.
11. Remaining limitations are clearly documented.

## Final Instructions

Do not stop after creating mockups, recommendations, or implementation plans.

Implement the redesigned UI/UX and approved workflow improvements directly in the existing codebase.

Prioritize usability, visual excellence, operational efficiency, reliability, and security.

Review and validate each role independently, then test the complete system across roles.

At completion, provide a concise summary of the redesigned interfaces, improved user journeys, modified files, tests performed, and remaining limitations.

**Ultimate Goal:** Transform Supremo Barber into a beautifully designed, intuitive, and operationally efficient barbershop management system where customers can book appointments effortlessly, barbers can manage their daily schedules efficiently, and administrators can oversee the business with clarity and confidence.