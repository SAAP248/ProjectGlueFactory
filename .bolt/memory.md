# Project memory

## Product intent & audience

- Web application for managing security/alarm monitoring systems and their provider accounts.
- Internal staff tool for managing Central Station (CS) and Communication Partner accounts, service controls, and customer/field actions.
- System detail page is a key surface: shows account info per provider and lets staff take actions on one or both account types.

## Brand personality & voice

- Professional, operational, clarity-first tone suitable for dispatch/admin staff.
- Explanatory labels and inline status messaging preferred over terse UI shorthand.

## Visual design & UX direction

- Tab-based layout on system detail page: **System Details** (account info) and **Actions** (account workflows + service controls) as siblings.
- Compact account status cards per provider showing provider name, account number, and account status separately from sync status.
- Account statuses to represent: Not Created, Creation Pending, Active, Termination Pending, Terminated.
- **Create Accounts** and **Terminate Accounts** as separate, clearly labeled sections; avoid lumping provider selection with action type.
- Red reserved for termination/destructive actions; not for ordinary provider selection.
- Explicit button labels naming the action + target (e.g., "Create Central Station Account").
- Review/confirmation panel before submission showing provider(s), customer, system, and required details; termination requires a reason and service-impact warning.
- Per-provider result feedback — "Both" must not mask individual success/failure.
- Service actions grouped by scope: CS service controls (On Test, Out of Service), Communication Partner tools (Send Welcome, Communication Test, Silence Beeps, Device Reset, Partner Portal), Customer & Field Actions (Text/Email Emergency Contact Update, Dispatch Technician).
- Recent action history panel: what happened, affected provider, requester, result.
- Disabled actions should explain why (e.g., "already active").
- Icons from lucide-react; Tailwind CSS for styling; no extra UI packages.

## Decisions, constraints & rationale

- Vite + React + JSX + Tailwind + Lucide React baseline; no additional UI/icon/theme packages unless explicitly requested.
- Separate account creation from account termination in the UI to reduce confusion from the current stacked buttons.
- Keep everyday service controls separate from permanent termination workflows.
- Treat account status and sync status as independent concepts; never imply created/terminated from request submission alone.
- Proposed Actions tab organization is agreed in concept; implementation not yet started pending two open questions below.

## Open questions & assumptions

- Does account creation/termination send requests directly to providers, or create staff tasks? (Asked, unanswered.)
- Are scheduled termination dates needed, or only immediate termination? (Asked, unanswered.)
- Assumed the system detail page already has Central Station and Communication Partner data and a tab mechanism to extend with an Actions tab.
- Assumed action history data is available or can be surfaced from existing backend.