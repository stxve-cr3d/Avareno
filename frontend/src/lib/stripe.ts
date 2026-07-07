import { loadStripe } from "@stripe/stripe-js";

export const stripePublishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  || import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  || ""
).trim();

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export const embeddedStripeCheckoutEnabled = Boolean(stripePublishableKey);
export const stripeCheckoutElementsEnabled = Boolean(stripePublishableKey);
