# DSFA / DPIA Screening

This checklist helps decide whether a Data Protection Impact Assessment (German DSFA, GDPR DPIA) may be required.

It is not legal advice. High-risk answers must be reviewed by a German privacy lawyer or external DSB.

## Feature

- Feature name:
- Description:
- Data categories:
- Users affected:
- Third parties:
- Launch state:

## High-Risk Triggers

Mark yes/no:

- Does the feature process sensitive or highly personal documents?
- Could users upload identity, health, insurance, payment, employment, tax, family, legal, or contract documents?
- Does the feature process large volumes of personal data?
- Does the feature import data from connected accounts such as email, cloud drives, retailers, or smart-home providers?
- Does the feature use AI to analyze documents or infer facts?
- Does the feature profile users, rank users, score reliability, or make eligibility decisions?
- Does the feature monitor behavior over time?
- Does the feature expose data to other users, helpers, support agents, or community members?
- Does the feature involve children, family members, tenants, employees, or third parties who may not be direct users?
- Does the feature process location, household, device, network, or smart-home information?
- Does the feature transfer personal data outside the EU/EEA?
- Does the feature use a new provider without DPA/AVV review?
- Would a data breach create significant harm to the user?

## AI-Specific Screening

- Is AI analysis optional and transparent?
- Can the user confirm/correct important facts?
- Is the AI provider documented?
- Is provider retention/training behavior documented?
- Is sensitive Vault content excluded by default?
- Are prompts minimized?
- Is AI prevented from making final legal, medical, financial, insurance, or warranty decisions?

## Connector-Specific Screening

- Is the connector read-only by default?
- Are scopes clear?
- Are raw payloads minimized?
- Is preview before import available?
- Can users disconnect and delete synced data?
- Are tokens encrypted at rest?
- Is SSRF protection implemented for custom URLs?
- Are rate limits and timeouts implemented?

## Screening Outcome

Use the most conservative outcome that applies.

- Low risk: proceed with privacy checklist and documentation.
- Medium risk: proceed only after product/security review.
- High risk: STOP. DSFA/DPIA likely needed before production.
- Unknown risk: STOP and ask for legal/privacy review.

## Required Follow-Ups

- Update processing activities draft.
- Update subprocessor/provider documentation.
- Define retention/deletion.
- Review user-facing consent/transparency.
- Review RLS/storage/access controls.
- Review incident response and breach impact.
