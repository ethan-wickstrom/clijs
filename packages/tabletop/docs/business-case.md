# Business case

The case the product would have to make to a paying customer, plus a brutal
internal bear case. Read both before deciding to build any further.

## Who pays

A CISO at a mid-market regulated firm where:

- The firm is subject to one or more of: NIST CSF (federal contractors,
  most US healthcare), 23 NYCRR 500 (NY-licensed financial entities), HIPAA
  Security Rule (covered entities and business associates), EU DORA
  (in-scope financial firms), or PCI-DSS 4.0 (Requirement 12.10.2 IR
  testing).
- The firm has between 200 and 5,000 employees and an in-house security
  team of 3–25 people. (Large enough to need formal exercises; small enough
  that the Big Four consultancies don't bother with them.)
- The annual security awareness / IR readiness budget is between $50k and
  $500k. The line item we want to capture is "IR exercises and tabletop
  facilitation."
- Today they either hire a regional consulting firm at $20–50k per
  facilitated exercise (one engagement, one slide deck, no compounding
  evidence), or they download a free DOJ / SANS template and run a clumsy
  in-person session that no auditor takes seriously.

## What we sell

A subscription:

- **Library access** — quarterly-refreshed scenario library mapped to the
  customer's regulatory scope.
- **AI-driven customisation** — each exercise is rewritten in the
  customer's environment (ticker, vendors, locations). The default
  scripted narrator works offline; the AI narrator demonstrates the
  customisation lever.
- **Auditor-ready reports** — every play-through emits a markdown / PDF
  after-action report mapped to MITRE ATT&CK / NIST CSF / NYDFS-500 /
  HIPAA / DORA control identifiers. The report is the auditor evidence.
- **Facilitator support** — a quarterly virtual session with one of our
  facilitators for the customer's most senior exercise.

Pricing tiers (initial guess, to be validated):

- **Starter — $25k/yr.** 8 scenarios, self-serve, AI customisation, 1
  facilitator session per year.
- **Standard — $55k/yr.** 24 scenarios, all frameworks, 4 facilitator
  sessions, audit-evidence packaging.
- **Compliance — $95k/yr.** Bespoke scenarios for the customer's
  environment, integration with their SIEM/IR tooling for "real" injects,
  unlimited facilitator support.

## Why this beats the consulting alternative

| Buyer pain                                          | Consultant today                  | Us                     |
| --------------------------------------------------- | --------------------------------- | ---------------------- |
| One exercise per year, no library, no continuity    | Yes                               | No — quarterly cadence |
| Each exercise requires re-onboarding the consultant | Yes                               | No — library compounds |
| Auditors want machine-readable control mapping      | Manual                            | Built-in               |
| Cost per exercise                                   | $20–50k each                      | $25–95k for the year   |
| Customisation per environment                       | Cheap if simple, expensive if not | AI does the rewrite    |

## Why this might not work

This is the bear case. It is real and we should not paper over it.

1. **The market for tabletop is genuinely mature.** SANS, Carnegie Mellon
   CERT, and a long tail of regional MSSPs sell tabletop facilitation. They
   have brand, certifications, and customer relationships we don't.
   Displacing the incumbent in even one customer is hard.
2. **The category may be cynically procured.** "We did a tabletop, here's
   our deck" is sometimes treated by both buyer and seller as a
   compliance-checkbox exercise. If the buyer doesn't actually want a
   better product, our differentiation doesn't matter.
3. **AI customisation is easy to copy.** Once we publish the playbook, an
   incumbent like KnowBe4 can ship the same feature in a quarter. Moat is
   not in the AI; it is in the curated scenario library and the
   auditor-recognised report format.
4. **Mid-market sales cycle is real.** 60–120 days assumes engaged buyer.
   In practice expect 6–9 months for the first paid pilot, with a 30%
   close rate from qualified opportunities. A 2-person team realistically
   closes 1–2 paid pilots in year one.
5. **Distribution is the hardest problem we haven't solved.** This pitch
   only works if we can reach 50–100 CISOs without spending 18 months on
   outbound. The most plausible distribution wedges:
   - Co-marketing with a regional MSSP that wants to upsell its existing
     customers.
   - Open-sourcing the engine (this binary, this scenario format) and
     monetising the curated scenario library + AI customisation tier on
     top. The free CLI is the marketing.
   - A vertical association (American Bankers Association, HIMSS) that
     would license the platform to its members.
6. **The acquirer story is real but not a plan.** "Build to be acquired by
   KnowBe4 / Mandiant / Proofpoint / IBM Resilient" is the rational exit,
   not the rational strategy. We need to be a real business first.

## Pre-conditions before this is sellable

- [ ] At least 12 hand-authored scenarios across at least 3 regulatory
      domains. (We have 1.)
- [ ] PDF report rendering, not just markdown.
- [ ] An actual landing page with a free playable scenario (terminal-only
      is a distribution problem the previous packages also failed on).
- [ ] At least one named design-partner CISO who has played through a
      scenario and signed off on "yes, I would pay for this."
- [ ] A signed pilot agreement template that addresses standard
      mid-market security review (SOC 2 Type II is too much; SIG-Lite
      questionnaire response is the realistic minimum).

## Recommended next move (not in this package)

Before writing more code: a 30-minute conversation with one CISO at a
community bank or regional health system, with the working binary as the
demo. Either they say "yes I would pay for this" — and we know what to
build next — or they say "no, here's why" — and we save months.
