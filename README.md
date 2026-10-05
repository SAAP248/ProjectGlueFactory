# ProjectGlueFactory

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ji7zql8p)

## Service Plans module

Annual maintenance agreements, billed monthly, quarterly, semiannually or annually. These are kept fully separate from monitoring RMR ("Subscriptions"), so monitoring is never billed twice. Everything lives under `src/pages/ServicePlans/` so the module can be moved out later.

### Where to find it
- **Service Plans** (sidebar): Dashboard, Agreements, Fulfillment, Billing, Reports, Settings.
- **Products > Service Plans**: the plan catalog and plan builder. Saving changes publishes a new, immutable version. Signed agreements stay on the version they signed.
- **Customer profile > Service Plans**: the customer's agreements, plus a wizard prefilled with the customer.
- **Customer profile > Sites & Systems**: a plan badge on every covered site.
- **Technician portal job detail**: a coverage banner for plan visits showing the plan, the benefit used and any discounts.

### Structure
| Path | Purpose |
|---|---|
| `lib/domain.ts` | Pure rules: money in integer cents, anchored month-end dates, billing schedule, grace period, lifecycle, entitlement balance, rollover, discount precedence, normalized revenue, CSV |
| `lib/adapters.ts` | Payment and monitoring adapters. The demo adapters simulate charges; a `card_declined` payment method always fails |
| `lib/billing.ts`, `lifecycle.ts`, `fulfillment.ts`, `catalog.ts` | Database operations |
| `EnrollmentWizard/`, `AgreementDetail/`, `Catalog/` | Screens |

### Rules
- **Invoices:** each billing occurrence creates one `SPI-` invoice. Occurrence keys are unique, so re-running billing never double-bills.
- **Grace period:** a failed charge moves the agreement to *past due* with a grace period (7 days by default). Benefits stay usable until the grace period ends.
- **Entitlement ledger:** `grant / rollover / reserve / consume / release / expire / adjust` entries. Scheduling a visit reserves it; completing the visit consumes it; cancelling it releases it. Visits closed on the regular Work Orders screens are reconciled during daily processing.
- **Discounts:** a manual discount always wins. Otherwise the larger of the plan or promo discount applies. Discounts never stack.
- **Cancellation:** the refund follows the plan version's policy (prorated or no refund).

### Demo mode
The demo uses a simulated company date (Oct 5 2026). The demo bar can move the date forward and process the day, and **Reset demo** restores the 12 seeded scenarios, SP-1001 to SP-1012. These cover active, past due (inside and outside grace), paused, renewal due, canceled, expired, draft and awaiting signature.

### Tests
`npm test` runs the domain unit tests in `tests/servicePlans.domain.test.ts`.
