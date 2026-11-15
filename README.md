# Skyward — Airline Seat Reservation System

A web UI for the `AirlineReservationSystem` MySQL database. Every attribute of all 8 tables
(Passenger, Flight, Seat, Booking, Payment, Cancellation, Review, Baggage) can be entered, viewed, edited and deleted.

**Stack:** Node.js + Express + MySQL (no build step; fonts and charts are bundled, works offline).

## Setup (Windows / macOS / Linux)

1. **Install Node.js 18+** from https://nodejs.org (once).
2. **Create the database** — open MySQL Workbench, connect, open `database/AirlineReservationSystem.sql`,
   click the lightning ⚡ button (run all). It creates the database, tables, views, procedures, triggers and sample data.
3. **Configure** — copy `.env.example` to `.env` and put your MySQL password in `DB_PASSWORD`
   (and `DB_USER` if it is not `root`).
4. **Run** — double-click `start.bat` (Windows) or run `./start.sh` (macOS/Linux).
   Or manually: `npm install` then `npm start`.
5. Open **http://localhost:3000** — the scroll-animated landing page. Press **D** or click *Open Dashboard*
   to reach the app at **http://localhost:3000/app.html**.

## Website & HCI
- **Landing page** (`public/index.html`, `css/landing.css`, `js/landing.js`): GSAP ScrollTrigger + Lenis smooth scroll,
  aircraft-window zoom hero, cloud parallax, jet → blueprint reveal, live database stats, three.js globe.
  Respects *prefers-reduced-motion* and has a Motion on/off toggle. All libraries are bundled in `public/vendor` (works offline).
- **Shneiderman's 8 Golden Rules** are implemented across the dashboard — see
  [`docs/HCI-8-Golden-Rules-Report.pdf`](docs/HCI-8-Golden-Rules-Report.pdf). Every location is tagged in code with
  `HCI-R1` … `HCI-R8` (`grep -rn "HCI-R" public`). Press **?** in the dashboard for keyboard shortcuts.

## What's inside

| Page | What it does |
|---|---|
| Dashboard | Revenue, occupancy, charts, upcoming flights, items needing attention |
| Book a seat | 5-step wizard: flight → seat map → passenger → booking/payment/baggage → review → boarding pass |
| Bookings / Payments / Cancellations / Baggage | Searchable, filterable, sortable lists; click a row for the full record; add/edit/delete |
| Flights / Seat maps | Manage flights; view each cabin, edit seats, add seats in bulk |
| Passengers / Reviews | Full passenger profiles and booking history; flight reviews |
| Insights | Occupancy, top spenders, best routes, ratings, payment mix (from the SQL views) |

Use the search box at the top to jump to any booking by PNR or passenger name. The moon/sun button switches light/night theme.

## Business rules built in
Fare = ticket price × seat multiplier × passengers · tax 12% · coupons WELCOME5/FLY10/SAVE15/FESTIVE20 ·
payment GST 5% + convenience fee by method · excess baggage ₹500/kg beyond the class allowance ·
cancellation charge 10% via `sp_CancelBooking` · IDs, PNR, invoice and bag-tag numbers are generated automatically.

## Note on the SQL file
One change from your original script: the `UNIQUE` constraint on `Booking.SeatID` was replaced by a normal index.
The unique key stopped a seat from ever being re-booked after a cancellation. Double-booking is still prevented by the app
(and the seat-status triggers) for active bookings.

## Troubleshooting
- **"Can't reach the database"** — check MySQL is running, the SQL script was executed, and `.env` has the right user/password.
- **`ER_NOT_SUPPORTED_AUTH_MODE` / auth errors** — in Workbench run:
  `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';`
- **Port in use** — change `PORT` in `.env`.
- This app has no login; run it on your own machine only.
