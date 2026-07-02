# AI Data Handling

Avareno may use AI-assisted extraction for Memory Build, receipts, warranties, products, documents, and support context. This document defines privacy and security rules for AI features.

## Core Rules

- AI analysis must be transparent to the user.
- AI-extracted facts should be marked as AI-assisted where appropriate.
- Important extracted facts should be user-confirmable.
- Users must be able to correct and delete AI-derived facts.
- Do not send unnecessary user data to AI providers.
- Do not include secrets, tokens, API keys, unrelated user data, or unrelated documents in prompts.
- Do not automatically analyze sensitive Private Vault documents by default.
- Do not claim warranty/legal/insurance/medical/financial results are guaranteed or legally binding.
- AI must not make final legal, medical, insurance, financial, or warranty decisions.

## Prompt Minimization

Prompts should include only:

- the active document/capture selected by the user
- the minimum context needed for the extraction task
- schema/instructions needed for structured output

Prompts must not include:

- unrelated documents
- full account profiles unless necessary
- connector tokens/secrets
- raw provider credentials
- unrelated household/family data
- hidden private notes not needed for the task
- Vault content unless the user explicitly requested analysis

## Document Extraction

For receipts, invoices, warranties, and manuals:

- show extracted facts as AI-assisted where appropriate
- let users confirm or correct key fields
- store source document references separately from extracted facts
- avoid storing raw OCR text longer than needed unless there is a clear product purpose
- consider retention for raw extraction text

Key fields that should be confirmable:

- product name/model
- purchase date
- warranty date
- price
- seller/provider
- serial number
- support or contract terms

Current MVP controls:

- `PATCH /api/documents/{document_id}/extracted-data` can update stored extracted fields after user review.
- The item detail document review panel exposes correction for stored extracted text and structured JSON.
- `POST /api/privacy/ai-data/delete` can remove stored `Document.extractedText` and `Document.extractedJson` values.
- These controls do not enable a real AI provider; provider region, retention, no-training/data-use behavior and DPA/AVV remain required before production AI.

## Sensitive Documents

Treat these as sensitive:

- insurance
- identity
- payment
- health
- employment
- contract
- legal
- tax
- family
- address-heavy documents
- highly personal correspondence

Sensitive documents require extra care:

- no automatic AI analysis by default
- explicit user action before analysis
- extra confirmation before third-party processing
- consider re-auth/passkey/PIN before sensitive actions
- do not use sensitive content for analytics, marketing, examples, or support screenshots

## Provider Handling

Before enabling a real AI/OCR provider, document:

- provider name
- purpose
- data categories
- processing region
- whether data leaves EU/EEA
- DPA/AVV status
- retention/deletion behavior
- training/data-use policy
- security controls
- opt-out or no-training settings
- user-facing disclosure

## Output Safety

AI output must be treated as uncertain.

- Use language like "AI-assisted", "extracted", "suggested", or "please confirm".
- Do not say "legally verified", "guaranteed", or "binding".
- Do not auto-submit warranty claims, insurance claims, legal notices, or financial decisions based only on AI output.

## Logging

Do not log full prompts or completions in production by default.

If debugging is needed:

- use short request ids
- use redacted samples
- keep retention short
- never log secrets or sensitive documents
- never expose prompts/completions in frontend errors

## Future TODOs

- Keep `backend/app/security/ai_data.py` aligned with this document as AI features move from mock/foundation to production.
- Add prompt redaction utilities.
- Add AI provider configuration documentation.
- Add user-visible AI disclosure copy.
- Add confirmation UI for important extracted fields.
- Add retention policy for raw OCR text and prompts.
- Add Vault-specific AI opt-in flow.
