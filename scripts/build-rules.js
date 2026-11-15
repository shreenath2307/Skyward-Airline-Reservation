#!/usr/bin/env node
/* Generates public/js/rules-data.js for the "8 Golden Rules" tour.
   Each implementation names the HCI-Rn marker comment it lives under; this script
   finds that marker in the source so the file:line shown in the tour is always exact.
   Run after editing code:  npm run rules            */
'use strict';
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');

// [what the user sees, how to try it, [file, marker text]...]
const RULES = [
  {
    n: 1, title: 'Strive for Consistency',
    def: 'Use uniform design patterns, terminology, visual styles and user flows across the entire interface.',
    try: { label: 'Open a form to compare', route: '#/flights', action: 'newRecord' },
    items: [
      ['One set of design tokens (fonts, colours, pill buttons) shared by the landing page and every dashboard screen', ['css/styles.css', '--sky-deep']],
      ['Every dialog footer: Cancel / secondary on the left, primary action on the right', ['js/ui.js', 'HCI-R1: one footer helper']],
      ['Booking wizard footer is always Back (left) and Continue (right)', ['js/pages/book.js', 'HCI-R1: wizard footer']],
      ['Same breadcrumb and page-header pattern on every page', ['js/main.js', 'HCI-R8: breadcrumb']],
      ['Shortcut letters shown next to every nav item; the brand always leads home', ['js/main.js', 'HCI-R1: shortcut letters'], ['app.html', 'HCI-R1: brand always']],
    ],
  },
  {
    n: 2, title: 'Seek Universal Usability',
    def: 'Design for novices and experts and for different abilities: shortcuts for power users, guidance for beginners.',
    try: { label: 'Show keyboard shortcuts', action: 'shortcuts' },
    items: [
      ['Keyboard shortcuts (g d, g b, g f, n, /, t, +, -, ?) for every frequent action', ['js/hci.js', 'HCI-R2: keyboard shortcuts']],
      ['Esc always closes the top-most dialog or panel', ['js/ui.js', 'HCI-R2/R7: Esc always']],
      ['Skip-to-content link for keyboard and screen-reader users', ['app.html', 'HCI-R2: skip link']],
      ['A- / A+ text size control, remembered between visits', ['app.html', 'HCI-R2: text size control'], ['js/hci.js', 'HCI-R2: A- / A+']],
      ['Visible focus rings and reduced-motion support', ['css/hci.css', 'HCI-R2: universal usability']],
      ['Table headers sortable and rows openable from the keyboard', ['js/pages/crud.js', 'HCI-R2: sortable headers']],
    ],
  },
  {
    n: 3, title: 'Offer Informative Feedback',
    def: 'Give a clear, human-readable response to every action, scaled to how often and how important it is.',
    try: { label: 'See a feedback toast', action: 'toast' },
    items: [
      ['Every save, delete or cancel shows a toast with an icon and a plain message, announced to screen readers', ['js/ui.js', 'HCI-R3: every toast']],
      ['Thin progress bar at the top while the database is being queried', ['js/hci.js', 'HCI-R3: top progress bar'], ['js/api.js', 'HCI-R3']],
      ['Buttons show a spinner and "Working…" while busy', ['js/ui.js', 'HCI-R3: loading state']],
      ['Live database status in the sidebar, re-checked every 30 s', ['js/main.js', 'HCI-R3: live database status']],
    ],
  },
  {
    n: 4, title: 'Design Dialogs to Yield Closure',
    def: 'Group actions into sequences with a beginning, middle and end, and signal clearly when a task is complete.',
    try: { label: 'Open the booking wizard', route: '#/book' },
    items: [
      ['5-step booking wizard with a step indicator (Flight → Seat → Passenger → Details → Review)', ['js/pages/book.js', 'HCI-R1: wizard footer']],
      ['"Booking confirmed" screen with PNR, seat, amount and next steps (print pass, book another, view booking)', ['js/pages/book.js', 'HCI-R4: closure']],
      ['Cancellation ends with a summary: refund, charge, seat released', ['js/forms.js', 'HCI-R4: explicit completion screen']],
      ['The row you just created or edited flashes so you can see the result', ['js/hci.js', 'HCI-R4: highlight the row']],
    ],
  },
  {
    n: 5, title: 'Prevent Errors',
    def: 'Make serious mistakes hard or impossible: restrict invalid input, validate in real time and use constraints.',
    try: { label: 'Try the New-flight form', route: '#/flights', action: 'newRecord' },
    items: [
      ['Create / Save stays disabled until every required field is valid ("N fields still need attention")', ['js/ui.js', 'HCI-R5: primary button stays disabled']],
      ['Real-time inline validation as you type', ['js/ui.js', 'HCI-R5: real-time inline validation']],
      ['Date and number limits: no past departures, arrival after departure, sensible ranges', ['js/forms.js', 'HCI-R5: per-table input constraints']],
      ['Booked seats are disabled in the seat map', ['js/seatmap.js', 'HCI-R5']],
      ['"Discard changes?" guard when closing a half-filled form', ['js/ui.js', 'HCI-R5: unsaved-changes guard']],
      ['Deletes need confirmation, with focus on the safe choice', ['js/forms.js', 'HCI-R5: a delete always']],
    ],
  },
  {
    n: 6, title: 'Permit Easy Reversal of Actions',
    def: 'Let users undo or cancel actions easily, which reduces anxiety and encourages exploration.',
    try: { label: 'See the Undo toast', action: 'undo' },
    items: [
      ['Delete hides the row at once and shows Undo for 6 s; the DELETE is only sent when the toast expires', ['js/hci.js', 'HCI-R6: undo-able deletes'], ['js/forms.js', 'HCI-R6']],
      ['Pending deletes are committed only when you move on or close the tab', ['js/main.js', 'HCI-R6'], ['js/hci.js', 'HCI-R6: queued deletes']],
      ['Applying or removing a coupon can be undone', ['js/pages/book.js', 'HCI-R6: coupon changes']],
      ['Back in the wizard keeps every choice already made', ['js/pages/book.js', 'HCI-R6: Back / stepper']],
    ],
  },
  {
    n: 7, title: 'Support Internal Locus of Control',
    def: 'Make users feel in charge of the system: no surprises, traps or forced automation.',
    try: { label: 'Open Settings', action: 'settings' },
    items: [
      ['Settings: theme, text size, motion on/off, notification level, dashboard sections', ['js/hci.js', 'HCI-R7: settings popover']],
      ['Dashboard sections can be shown or hidden, and the choice is remembered', ['js/pages/dashboard.js', 'HCI-R7: apply the user']],
      ['Every toast can be dismissed (×) and pauses while hovered', ['js/ui.js', 'HCI-R7: every toast can be dismissed']],
      ['The wizard never moves forward by itself', ['js/pages/book.js', 'HCI-R7: picking a flight']],
      ['Motion toggle on the landing page, shared with the dashboard', ['js/landing.js', "MOTION_KEY = 'skyward-motion'"]],
    ],
  },
  {
    n: 8, title: 'Reduce Short-Term Memory Load',
    def: 'Rely on recognition rather than recall: keep options, menus and context visible on screen.',
    try: { label: 'Show recent searches', action: 'search' },
    items: [
      ['Search box lists recent searches and recently viewed bookings', ['js/hci.js', 'HCI-R8: recent searches']],
      ['Trip summary in the booking wizard keeps flight, seat, passenger and price visible on every step', ['js/pages/book.js', 'HCI-R8: persistent trip summary']],
      ['Each list page remembers its last search, filter and sort', ['js/pages/crud.js', 'HCI-R8: remember the last search']],
      ['Breadcrumbs and tooltips on every icon button', ['js/main.js', 'HCI-R8: breadcrumb'], ['js/drawers.js', 'HCI-R8: tooltips']],
    ],
  },
];

const cache = {};
function locate(file, marker) {
  const lines = cache[file] || (cache[file] = fs.readFileSync(path.join(PUB, file), 'utf8').split(/\r?\n/));
  const i = lines.findIndex((l) => l.includes(marker));
  if (i < 0) throw new Error(`Marker not found: ${file} :: ${marker}`);
  return `public/${file}:${i + 1}`;
}

const out = RULES.map((r) => ({
  n: r.n, title: r.title, def: r.def, try: r.try,
  items: r.items.map(([text, ...refs]) => ({ text, where: refs.map(([f, m]) => locate(f, m)) })),
}));

const banner = '/* GENERATED by scripts/build-rules.js — do not edit by hand (npm run rules). */\n';
fs.writeFileSync(path.join(PUB, 'js', 'rules-data.js'), `${banner}export const RULES = ${JSON.stringify(out, null, 2)};\n`);
console.log(`rules-data.js written: ${out.length} rules, ${out.reduce((a, r) => a + r.items.length, 0)} implementations`);
