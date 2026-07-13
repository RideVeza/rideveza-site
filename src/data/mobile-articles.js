// Single source of truth for the mobile support hub articles.
// Ordered: get the app & get in (troubleshooting hubs), then using the app.
//
// Each entry has either:
//  - `slug`: an Astro guide at src/pages/support/mobile/<slug>.astro, with
//    screenshots under public/images/support/mobile/<slug>/. Its href is
//    derived below.
//  - `href`: a static page copied verbatim from public/ (the troubleshooting
//    hubs). Static pages can't be drafts.
//
// `ready: false` marks a guide as a draft: the hub greys its card in dev,
// drops it from production builds, and the prune step in astro.config.mjs
// deletes the built page (and its image folder) from dist so it never
// deploys. The prune step fails the build if a slug doesn't match a built
// page, or a built page isn't registered here. Flip a guide to `ready: true`
// when it's finished.
const entries = [
  {
    href: "/support/mobile/download-app/",
    title: "Downloading the app",
    blurb: "Get the Veza Mobile App onto your phone, and fix common download problems.",
    ready: true,
  },
  {
    href: "/support/mobile/account-setup/",
    title: "Setting up your account",
    blurb: "Create your account with a passkey, and fix common setup problems.",
    ready: true,
  },
  {
    slug: "signing-in",
    title: "Signing in",
    blurb: "Sign in with one tap using your passkey.",
    ready: false,
  },
  {
    slug: "run-dashboard",
    title: "Run dashboard",
    blurb: "See today's runs, upcoming runs and your assigned routes.",
    ready: true,
  },
  {
    slug: "run-summary",
    title: "Run summary",
    blurb: "Open a run to see its schedule, riders, team and map.",
    ready: false,
  },
  {
    slug: "step-by-step",
    title: "Step by step view",
    blurb: "Complete a run — check in, inspect, and mark riders picked up or absent.",
    ready: false,
  },
  {
    slug: "rider-details",
    title: "Rider details",
    blurb: "View a rider's profile — care needs, contacts, school and schedule.",
    ready: false,
  },
  {
    slug: "contacts",
    title: "Contacts",
    blurb: "Find phone numbers and emails for your organization.",
    ready: false,
  },
  {
    slug: "resources",
    title: "Resources",
    blurb: "Open forms, documents and school calendars.",
    ready: false,
  },
  {
    slug: "account",
    title: "Account settings",
    blurb: "Update your profile, choose your map app and log out.",
    ready: false,
  },
  {
    slug: "glossary",
    title: "Icon glossary",
    blurb: "What each icon in the app means, from care needs to bus staff.",
    ready: true,
  },
];

export const articles = entries.map((a) => ({
  ...a,
  href: a.href ?? `/support/mobile/${a.slug}`,
}));
