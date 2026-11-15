<p align="center">
  <img src="docs/banner.svg" alt="Skyward - Airline Seat Reservation System" width="100%">
</p>

# Skyward — Airline Seat Reservation System

A DBMS college project: a full-stack web app on top of a hand-written **MySQL 8** database
(`AirlineReservationSystem`). Every attribute of all 8 tables can be created, viewed, edited and
deleted from the UI, bookings go through a 5-step wizard, and the front end is built around
**Shneiderman's 8 Golden Rules** of interface design (our HCI component).

> **Stack:** Node.js 18+ · Express 4 · MySQL 8 (`mysql2`) · vanilla JS (ES modules, no build step) ·
> GSAP / Lenis / three.js / Chart.js (all bundled in `public/vendor`, works offline).

---

## Table of contents
1. [Quick start](#1-quick-start)
2. [Project structure](#2-project-structure)
3. [The database](#3-the-database)
4. [Business rules](#4-business-rules)
5. [Backend (server/)](#5-backend-server)
6. [REST API reference](#6-rest-api-reference)
7. [Frontend (public/)](#7-frontend-public)
8. [HCI — the 8 Golden Rules](#8-hci--the-8-golden-rules)
9. [Deployment](#9-deployment)
10. [Docs & deliverables](#10-docs--deliverables)
11. [Working on the project (team guide)](#11-working-on-the-project-team-guide)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Quick start

**Prerequisites:** [Node.js 18+](https://nodejs.org), MySQL 8.0+ with MySQL Workbench.

1. **Clone** the repo and open the folder.
2. **Create the database** — open `database/AirlineReservationSystem.sql` in MySQL Workbench and run
   the whole script (⚡ button / `Ctrl+Shift+Enter`). It drops and recreates the database, all tables,
   indexes, views, functions, stored procedures, triggers and the sample data.
3. **Configure** — copy `.env.example` to `.env` and set `DB_PASSWORD` (and `DB_USER` if not `root`).
4. **Run**
   - Windows: double-click `start.bat`
   - macOS/Linux: `./start.sh`
   - or manually: `npm install` then `npm start` (`npm run dev` = auto-restart on file changes)
5. Open **http://localhost:3000** (landing page). Press **D** or click *Open Dashboard* to reach the
   app at **http://localhost:3000/app.html**.

`.env` variables:

| Variable | Default | Meaning |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` | MySQL server |
| `DB_USER` / `DB_PASSWORD` | `root` / *(empty)* | Credentials |
| `DB_NAME` | `AirlineReservationSystem` | Database name |
| `PORT` | `3000` | Web server port |
| `DB_SSL` / `DB_SSL_CA` | unset | Set `DB_SSL=true` for cloud MySQL that requires TLS (e.g. Aiven); `DB_SSL_CA` is the CA certificate PEM (use `\n` for newlines) |

> `.env` is git-ignored. **Never commit real credentials.** There is no login — run locally or keep
> any public deployment behind something you control.

---

## 2. Project structure

```
Skyward-Airline-Reservation/
├── database/
│   └── AirlineReservationSystem.sql   # whole DB: schema, indexes, views, functions, procs, triggers, data
├── server/                            # Express API (CommonJS)
│   ├── index.js                       # app bootstrap, static hosting, error handler
│   ├── db.js                          # mysql2 pool, TLS config, tx() helper, schema introspection
│   ├── meta.js                        # per-entity config (columns come from the live DB)
│   ├── pricing.js                     # fare / tax / coupon / baggage rules (shared with the browser)
│   ├── services.js                    # booking, cancellation, seat generation, ID/PNR generators
│   ├── errors.js                      # HttpError + translation of MySQL errors to friendly messages
│   ├── airports.js                    # airport list for dropdowns
│   └── routes/
│       ├── ops.js                     # specific endpoints: search, book, cancel, dashboard, insights…
│       └── crud.js                    # generic /api/:entity list/get/create/update/delete
├── public/                            # static front end (served by Express, or by Vercel)
│   ├── index.html + css/landing.css + js/landing.js   # animated landing page
│   ├── app.html                       # dashboard shell
│   ├── css/  styles.css · hci.css · rules.css · landing.css
│   ├── js/   main.js (router/shell) · api.js · ui.js · forms.js · drawers.js · ticket.js …
│   │   ├── pages/  dashboard · book · crud · seats · insights
│   │   ├── hci.js · prefs.js            # Golden-Rule features, user preferences
│   │   └── rules.js · rules-data.js     # the interactive "8 Golden Rules" tour
│   ├── vendor/                        # gsap, ScrollTrigger, SplitText, Lenis, three.js, Chart.js
│   ├── fonts/ img/                    # self-hosted fonts & images (licenses included)
├── scripts/build-rules.js             # regenerates public/js/rules-data.js (see §8)
├── docs/                              # project report, presentation, HCI report
├── vercel.json · .vercelignore        # Vercel static hosting + /api proxy
├── start.bat · start.sh               # one-click launchers
└── .env.example
```

---

## 3. The database

**Engine:** MySQL 8.0+, `utf8mb4`. The script is idempotent — it starts with `DROP DATABASE IF EXISTS`,
so **re-running it resets everything back to the sample data**.

### Tables (8) and relationships

```
Passenger ──< Booking >── Flight ──< Seat
                │  ▲                  ▲
                │  └──────────────────┘   (Booking → Seat, Booking → Flight)
                ├──< Payment
                ├──< Cancellation
                └──< Baggage
Passenger ──< Review >── Flight
```

| Table | ID range | Purpose |
|---|---|---|
| `Passenger` | 100001+ | Personal details, passport/gov ID, loyalty tier (`None/Silver/Gold/Platinum`), meal & seat preference |
| `Flight` | 20001+ | Route, airline, schedule, status, ticket price, total/available seats, crew |
| `Seat` | 300001+ | Per-flight seat inventory: class, status, price multiplier |
| `Review` | 400001+ | 1–5 rating, cleanliness / food ratings, moderation status |
| `Booking` | 500001+ | A passenger's reservation of one seat on one flight (PNR, fare, discount, tax) |
| `Payment` | 700001+ | Amount, method, convenience fee, GST, status, invoice no. |
| `Baggage` | 800001+ | Bag weight, allowance, extra charge, tag number |
| `Cancellation` | 900001+ | Reason, cancellation charge, refund amount |

All foreign keys are enforced (`fk_booking_passenger`, `fk_booking_flight`, `fk_booking_seat`,
`fk_seat_flight`, `fk_payment_booking`, `fk_cancellation_booking`, `fk_baggage_booking`,
`fk_review_passenger`, `fk_review_flight`). Plus `UNIQUE` (email, phone, passport, govt ID),
`CHECK` constraints (non-negative fares, rating 1–5, source ≠ destination, …) and secondary indexes
on commonly filtered columns.

### Views (4)
`vw_BookingDetails` · `vw_FlightOccupancy` · `vw_PassengerSpending` · `vw_TopRatedFlights`
(the **Insights** page reads from these).

### Functions (4)
`fn_CalculateAge(dob)` · `fn_GetPassengerFullName(id)` · `fn_LoyaltyTier(flightsTaken)` ·
`fn_FlightOccupancyPercent(flightId)`

### Stored procedures (4)
| Procedure | What it does |
|---|---|
| `sp_BookSeat(passenger, flight, seat, numPax, channel, OUT bookingRef)` | Books a seat, computes fare with the seat multiplier + 12% tax |
| `sp_CancelBooking(bookingId, reason)` | Cancels a booking: 10% charge, refund, writes the `Cancellation` row |
| `sp_GetPassengerBookingHistory(passengerId)` | Booking history for one passenger |
| `sp_FlightRevenueReport(flightId)` | Revenue summary for one flight |

### Triggers (5)
| Trigger | Effect |
|---|---|
| `trg_passenger_before_insert` | Lower-cases the passenger email |
| `trg_booking_before_insert` | Blocks booking a seat that is already `Booked` or belongs to another flight |
| `trg_booking_after_insert` | Marks the seat `Booked`, decrements `Flight.AvailableSeats` |
| `trg_cancellation_after_insert` | Booking → `Cancelled`, seat → `Available`, restores `AvailableSeats` |
| `trg_review_before_insert` | Auto-flags 1-star reviews (`ReviewStatus = 'Flagged'`) |

### Sample data
The script ends with realistic sample rows for every table (passengers, flights with full seat maps, bookings, payments, baggage, cancellations and reviews) so the dashboard and Insights have data from the first run.

### Note on a deliberate change
The `UNIQUE` constraint on `Booking.SeatID` was replaced by a normal index. A unique key stopped a seat
from ever being re-booked after a cancellation. Double-booking of *active* bookings is still prevented
by `trg_booking_before_insert` and the app's seat-status checks.

---

## 4. Business rules

All implemented in `server/pricing.js` and mirrored from the SQL script. The same constants are sent
to the browser via `GET /api/meta`, so the live price summary on screen always equals what the server stores.

| Rule | Value |
|---|---|
| Fare | `TicketPrice × SeatPriceMultiplier × passengers` |
| Max passengers per booking | 9 |
| Coupons (% off the fare) | `WELCOME5` 5% · `FLY10` 10% · `SAVE15` 15% · `FESTIVE20` 20% |
| Tax | 12% of the fare after discount |
| Payment GST | 5% of the booking amount |
| Convenience fee (by method) | Credit Card 1% · Debit Card 0.5% · UPI 0% · Net Banking 0.75% · Wallet 0.5% |
| Free baggage allowance | First 40 kg · Business 32 kg · Premium Economy 25 kg · Economy 20 kg |
| Excess baggage | ₹500 per kg over the allowance |
| Cancellation charge | 10% (via `sp_CancelBooking`) |
| Auto-generated | Booking IDs, **PNR**, invoice numbers, bag-tag numbers |

---

## 5. Backend (`server/`)

- **`index.js`** — mounts `ops` routes **before** the generic CRUD routes (order matters, otherwise
  `/flights/search` would be swallowed by `/:entity/:id`), serves `public/` statically, falls back to
  `index.html`, and converts errors into tidy JSON.
- **`db.js`** — a `mysql2` connection pool (`dateStrings` and `decimalNumbers` on, so no timezone shifts and
  DECIMALs are real numbers), optional TLS for cloud MySQL, a `tx(fn)` helper that commits/rolls back
  automatically, and `getSchema()` which reads column metadata from `information_schema`.
- **`meta.js`** — one entry per entity (`passengers`, `flights`, `seats`, `bookings`, `payments`,
  `cancellations`, `reviews`, `baggage`): table/alias/PK, list `SELECT` and `JOIN`s, searchable columns,
  sortable keys, filters, form field grouping, and which fields are locked after creation.
  **Columns are discovered from the live database**, so adding a column to a table shows up in the
  forms/lists automatically; `meta.js` only adds presentation and behaviour.
- **`services.js`** — transactional business logic: create a full booking (booking + payment + baggage),
  cancel a booking, bulk-generate seats for a flight, generate IDs/PNR/invoice/tag numbers.
- **`errors.js`** — `HttpError` plus a translator that maps MySQL errors (duplicate key, FK violation,
  `CHECK` failures, trigger `SIGNAL`s) to human-readable, field-level messages for the UI.

---

## 6. REST API reference

All routes are under `/api`. Responses are JSON; errors are `{ "error": "...", "fields": {...} }`.

### Operations (`server/routes/ops.js`)
| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | DB connectivity check |
| GET | `/meta` | Entity schemas + pricing constants for the front end |
| GET | `/lookup/:kind` | Dropdown data (passengers, flights, airports, …) |
| GET | `/flights/search` | Search flights by route/date |
| GET | `/flights/:id/seats` | Seat map for a flight |
| GET | `/flights/:id/overview` | Flight detail drawer data |
| GET | `/passengers/:id/overview` | Passenger profile + booking history |
| GET | `/bookings/:id/overview` | Full booking record (payment, baggage, cancellation) |
| POST | `/book` | Create booking + payment + baggage in one transaction |
| POST | `/bookings/:id/cancel` | Cancel a booking (refund calc, seat released) |
| POST | `/seats/generate` | Bulk-add seats to a flight |
| GET | `/coupon/:code` | Validate a coupon |
| GET | `/dashboard` | KPIs, charts, upcoming flights, attention items |
| GET | `/insights` | Data from the SQL views |

### Generic CRUD (`server/routes/crud.js`) — `:entity` is one of `passengers, flights, seats, bookings, payments, cancellations, reviews, baggage`
| Method | Route | Purpose |
|---|---|---|
| GET | `/:entity` | List with search, filter, sort, pagination (`page`, `pageSize`, max 500) |
| GET | `/:entity/:id` | One record |
| POST | `/:entity` | Create (not for `bookings` — use `POST /book`, which returns 405 otherwise) |
| PUT | `/:entity/:id` | Update |
| DELETE | `/:entity/:id` | Delete |
| GET | `/:entity/:id/impact` | What would be affected by deleting this record (shown before confirming a delete) |

---

## 7. Frontend (`public/`)

No framework and no build step — plain ES modules loaded straight from the browser.

### Landing page (`index.html`)
Scroll-animated marketing page: GSAP + ScrollTrigger + Lenis smooth scroll, aircraft-window zoom hero,
cloud parallax, jet → blueprint reveal, live stats pulled from the database, and a three.js globe.
It respects `prefers-reduced-motion` and has a Motion on/off toggle.

### Dashboard (`app.html`) — hash-routed single-page app
| Route | Page | What it does |
|---|---|---|
| `#/dashboard` | Dashboard | Revenue, occupancy, charts, upcoming flights, items needing attention |
| `#/book` | Book a seat | 5-step wizard: flight → seat map → passenger → booking/payment/baggage → review → boarding pass |
| `#/bookings` `#/payments` `#/cancellations` `#/baggage` | CRUD lists | Searchable, filterable, sortable; click a row for the full record; add/edit/delete |
| `#/flights` | Flights | Manage flights |
| `#/seats` | Seat maps | View each cabin, edit seats, add seats in bulk |
| `#/passengers` `#/reviews` | CRUD lists | Full passenger profiles with history; flight reviews |
| `#/insights` | Insights | Occupancy, top spenders, best routes, ratings, payment mix |

One generic `pages/crud.js` renders **all** list pages from the server's entity metadata.
Use the top search box to jump to any booking by **PNR** or passenger name.
The moon/sun button toggles light / night theme.

### Key modules
`main.js` (shell, nav, router) · `api.js` (fetch wrapper + metadata cache) · `ui.js` (modals, toasts,
tables, layers) · `forms.js` (metadata-driven forms) · `drawers.js` (record detail drawers) ·
`seatmap.js` / `ticket.js` (seat grid, boarding pass) · `prefs.js` (persisted user settings) ·
`util.js` (`html` tagged template, DOM helpers).

---

## 8. HCI — the 8 Golden Rules

The UI implements Shneiderman's rules: **1** Consistency · **2** Universal usability · **3** Informative
feedback · **4** Closure in dialogs · **5** Error prevention / simple error handling · **6** Easy reversal ·
**7** User in control · **8** Reduce short-term memory load.

- Every implementation in the code is tagged with a marker comment: **`HCI-R1` … `HCI-R8`**.
  Find them all with `grep -rn "HCI-R" public`.
- The landing page has a **"8 Golden Rules" tour button** — a live guided tour that jumps to each
  feature in the running app.
- The tour's data (`public/js/rules-data.js`) is **generated**. If you move or edit code that carries an
  `HCI-R` marker, regenerate it so the `file:line` references stay exact:

  ```bash
  npm run rules
  ```
  The mapping of rules → features lives in `scripts/build-rules.js`.
- Notable features: top progress bar during requests, keyboard shortcuts (press **`?`**), settings popover
  (theme, text size A−/A+), skip link, undo-able deletes, recent-search dropdown, focus-visible everywhere.
- Full write-up: [`docs/HCI-8-Golden-Rules-Report.pdf`](docs/HCI-8-Golden-Rules-Report.pdf).

**Keyboard shortcuts**

| Keys | Action |
|---|---|
| `g` then `d/b/k/f/s/p/y/r/i/h` | Go to Dashboard / Book / Bookings / Flights / Seat maps / Passengers / Payments / Reviews / Insights / Home |
| `n` | New booking |
| `/` | Search bookings by PNR or name |
| `t` | Toggle light/night theme |
| `+` / `-` | Larger / smaller text |
| `,` | Settings |
| `?` | Show all shortcuts |
| `Esc` | Close the open dialog / drawer / menu |

---

## 9. Deployment

The live setup splits the app across free hosts:

```
Browser ──> Vercel (static public/)  ──/api/*──> Railway (Node server) ──> Aiven (MySQL, TLS)
```

- **Vercel** serves `public/` (`vercel.json`: `outputDirectory: public`, no build) and **rewrites `/api/*`**
  to the Railway backend URL. `.vercelignore` keeps `server/`, `database/`, `docs/` and secrets out.
- **Railway** runs `node server/index.js`; set the `DB_*` variables and `DB_SSL=true` (+ `DB_SSL_CA`) in its
  environment settings.
- **Aiven MySQL** hosts the database (run the SQL script against it once).
- If the backend URL changes, update the rewrite destination in `vercel.json`.

---

## 10. Docs & deliverables

| File | What it is |
|---|---|
| `docs/Skyward-DBMS-Report.docx` | Full DBMS project report |
| `docs/Skyward-DBMS-Presentation.pptx` | Presentation deck |
| `docs/HCI-8-Golden-Rules-Report.pdf` | HCI report mapping each rule to the implementation |

---

## 11. Working on the project (team guide)

- **Branching:** work on a branch, open a PR into `main`, and `git pull` before you start — several of us
  touch the same files (`public/js/*`, the SQL script).
- **Never commit** `.env`, `node_modules/` or credentials.
- **Changing the database schema?** Edit `database/AirlineReservationSystem.sql` (it is the single source of
  truth) and tell everyone to re-run it. If you add a column, the UI picks it up automatically, but add
  presentation hints in `server/meta.js` and, for new `CHECK`/unique constraints, a friendly message in
  `server/errors.js`.
- **Adding a new entity/table?** Add it to the SQL script, add an entry in `server/meta.js`, add a nav
  item/title/page in `public/js/main.js`.
- **Changing pricing rules?** Edit `server/pricing.js` *and* keep `sp_BookSeat` / `sp_CancelBooking` in the
  SQL script consistent with it.
- **Touching HCI-tagged code?** Keep the `HCI-Rn` comment, then run `npm run rules`.
- **Style:** server is CommonJS, front end is ES modules; HTML is built with the `html` tagged template in
  `public/js/util.js` (it escapes values — don't concatenate raw strings into the DOM).
- **Cache:** HTML/JS/CSS are served with `no-cache`, so a normal refresh always shows your latest changes.

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| **"Can't reach the database"** | MySQL isn't running, the SQL script wasn't executed, or `.env` has the wrong user/password/port |
| **`ER_NOT_SUPPORTED_AUTH_MODE` / auth errors** | In Workbench: `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';` |
| **Port already in use** | Change `PORT` in `.env` |
| **Cloud DB connection refused / TLS error** | Set `DB_SSL=true` and provide `DB_SSL_CA` |
| **Data looks wrong / want a clean slate** | Re-run `database/AirlineReservationSystem.sql` (resets to sample data) |
| **Blank page opening `app.html` from disk** | Use `http://localhost:3000`; ES modules and the API need the server |
| **"Seat already booked" error** | Expected — enforced by `trg_booking_before_insert`; pick another seat |

---

*Skyward — DBMS course project. Fonts are licensed under their respective licenses in `public/fonts/`.*
