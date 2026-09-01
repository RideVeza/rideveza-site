// Weekly "What's New" newsletter archive.
//
// To add next week's edition:
//   1. Save the sent email HTML as  src/newsletters/<week-date>.html
//      (week-date = the Monday shown in the "Week of ..." line, e.g. 2026-07-13.html).
//      The logo src is swapped and the preheader is stripped automatically at build
//      time, so you can drop the raw exported file in as-is.
//   2. Add one entry to the TOP of this array (newest first).
//
// slug MUST match the filename (without .html). It becomes the URL: /newsletters/<slug>.
export const editions = [
  { slug: "2026-08-24", title: "Week of August 24, 2026" },
  { slug: "2026-08-17", title: "Week of August 17, 2026" },
  { slug: "2026-08-10", title: "Week of August 10, 2026" },
  { slug: "2026-08-03", title: "Week of August 3, 2026" },
  { slug: "2026-07-27", title: "Week of July 27, 2026" },
  { slug: "2026-07-20", title: "Week of July 20, 2026" },
  { slug: "2026-07-13", title: "Week of July 13, 2026" },
  { slug: "2026-07-06", title: "Week of July 6, 2026" },
  { slug: "2026-06-29", title: "Week of June 29, 2026" },
];
