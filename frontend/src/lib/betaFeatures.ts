/**
 * Central feature flags for the focused Avareno beta.
 *
 * The beta ships one core promise: capture products, attach receipts /
 * warranties / documents, and find everything again. Larger future modules
 * stay in the codebase but are switched off here so they disappear from
 * navigation, routes, dashboards and quick actions in one place.
 *
 * Re-enable a module by flipping its flag — routes in `main.tsx`,
 * navigation in `AppShell.tsx` and the command palette all read from this
 * config.
 */
const inviteOnly = import.meta.env.VITE_BETA_INVITE_ONLY !== "false";

export const betaFeatures = {
  /** Closed beta: accounts are provisioned by an administrator. */
  inviteOnly,
  /** Only email/password auth is exposed during the invite beta. */
  emailPasswordOnly: inviteOnly,
  receiptExtraction: import.meta.env.VITE_ENABLE_RECEIPT_EXTRACTION === "true",
  documentProcessing: import.meta.env.VITE_ENABLE_DOCUMENT_PROCESSING === "true",
  oauth: import.meta.env.VITE_ENABLE_OAUTH === "true",
  householdSharing: import.meta.env.VITE_ENABLE_HOUSEHOLD_SHARING === "true",
  publicDocumentLinks: import.meta.env.VITE_ENABLE_PUBLIC_DOCUMENT_LINKS === "true",
  inlineDocumentPreview: import.meta.env.VITE_ENABLE_INLINE_DOCUMENT_PREVIEW === "true",
  billing: import.meta.env.VITE_ENABLE_BILLING === "true",
  documentUploads: import.meta.env.VITE_ENABLE_DOCUMENT_UPLOADS !== "false",
  /** Smart-home device list, live device controls, device detail pages. */
  smartHome: false,
  /** Home-graph provider connections (HomeGraphConnect). */
  connect: false,
  /** Resolve: support tickets / open issues module. */
  resolve: false,
  /** Private vault with PIN-protected documents. */
  vault: false,
  /** Friends, invites, XP/streak comparison (community layer). */
  community: false,
  /** "Ask Avareno" experimental AI surface. */
  ask: false,
  /** One-box "smart capture" that guesses products from free text. */
  universalCapture: false,
  /** Message-to-reminder parsing capture flow. */
  messageCapture: false,
  /** Curated spare-part/accessory recommendations on the product page. */
  recommendations: false,
} as const;

export type BetaFeature = keyof typeof betaFeatures;
