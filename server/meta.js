'use strict';
const { getSchema } = require('./db');
const { PRICING } = require('./pricing');
const AIRPORTS = require('./airports');
const { spaced } = require('./errors');

/**
 * One entry per table. The *columns* come from the live database (information_schema);
 * this file only adds presentation + behaviour: how rows are listed/searched, how the
 * form is grouped, and which fields are locked once a record exists.
 */
const ENTITIES = {
  passengers: {
    table: 'Passenger', alias: 'p', pk: 'PassengerID', singular: 'Passenger', plural: 'Passengers',
    from: 'Passenger p',
    select: "p.*, fn_CalculateAge(p.DOB) AS Age, CONCAT(p.FirstName, ' ', p.LastName) AS FullName",
    search: ['p.PassengerID', 'p.FirstName', 'p.LastName', 'p.Email', 'p.Phone', 'p.PassportNumber', 'p.GovernmentID', 'p.City', 'p.Country'],
    order: 'p.PassengerID DESC',
    sortKeys: { FullName: 'p.FirstName, p.LastName', Age: 'p.DOB' },
    filter: 'FrequentFlyerMembership',
    groups: [
      ['Personal details', ['FirstName', 'MiddleName', 'LastName', 'Gender', 'DOB']],
      ['Contact', ['Email', 'Phone', 'EmergencyContact', 'Address', 'City', 'State', 'Country', 'ZipCode']],
      ['Travel documents', ['Nationality', 'PassportNumber', 'GovernmentID']],
      ['Preferences', ['MealPreference', 'SeatPreference']],
      ['Loyalty programme', ['FrequentFlyerMembership', 'FlightsTaken', 'LoyaltyPoints']],
    ],
    hints: {
      FirstName: { span: 1 }, MiddleName: { span: 1 }, LastName: { span: 1 },
      Email: { type: 'email', placeholder: 'name@example.com', span: 2, transform: 'lower' },
      Phone: { type: 'tel', placeholder: '+91 98765 43210' },
      EmergencyContact: { type: 'tel', placeholder: '+91 98765 43210' },
      Address: { span: 3, type: 'text' },
      DOB: { label: 'Date of birth' },
      ZipCode: { label: 'PIN / ZIP code' },
      PassportNumber: { transform: 'upper', placeholder: 'e.g. N1234567' },
      GovernmentID: { label: 'Government ID', transform: 'upper', placeholder: 'e.g. GOV00099001' },
      FlightsTaken: { hint: 'Number of completed flights' },
      LoyaltyPoints: { hint: 'Earned points balance' },
    },
  },

  flights: {
    table: 'Flight', alias: 'f', pk: 'FlightID', singular: 'Flight', plural: 'Flights',
    from: 'Flight f',
    select: `f.*, (f.TotalSeats - f.AvailableSeats) AS SeatsBooked,
             TIMESTAMPDIFF(MINUTE, TIMESTAMP(f.DepartureDate, f.DepartureTime), TIMESTAMP(f.ArrivalDate, f.ArrivalTime)) AS DurationMin`,
    search: ['f.FlightID', 'f.FlightNumber', 'f.AirlineName', 'f.SourceAirport', 'f.DestinationAirport', 'f.AircraftModel', 'f.PilotName'],
    order: 'f.DepartureDate ASC, f.DepartureTime ASC',
    sortKeys: { Route: 'f.SourceAirport, f.DestinationAirport', Departure: 'f.DepartureDate, f.DepartureTime', Seats: 'f.AvailableSeats' },
    filter: 'FlightStatus',
    groups: [
      ['Flight', ['FlightNumber', 'AirlineName', 'AircraftModel', 'FlightStatus']],
      ['Route', ['SourceAirport', 'DestinationAirport', 'DistanceKM', 'Terminal', 'Gate']],
      ['Schedule', ['DepartureDate', 'DepartureTime', 'ArrivalDate', 'ArrivalTime']],
      ['Fare & capacity', ['TicketPrice', 'TotalSeats', 'AvailableSeats']],
      ['Crew', ['PilotName', 'CabinCrewCount']],
    ],
    hints: {
      FlightNumber: { transform: 'upper', placeholder: 'e.g. AI101' },
      AirlineName: { datalist: 'airlines' },
      AircraftModel: { datalist: 'aircraft' },
      SourceAirport: { label: 'From (airport code)', transform: 'upper', placeholder: 'BOM', maxLength: 3 },
      DestinationAirport: { label: 'To (airport code)', transform: 'upper', placeholder: 'DEL', maxLength: 3 },
      DistanceKM: { label: 'Distance (km)' },
      TicketPrice: { label: 'Base ticket price (₹)', hint: 'Economy price - other cabins multiply this' },
      TotalSeats: { label: 'Total seats', hint: 'A seat map is generated automatically', lockedOnEdit: true },
      AvailableSeats: { label: 'Available seats', readonly: true, hint: 'Updated automatically by bookings', hideOnCreate: true },
      CabinCrewCount: { label: 'Cabin crew' },
    },
  },

  seats: {
    table: 'Seat', alias: 's', pk: 'SeatID', singular: 'Seat', plural: 'Seats',
    from: `Seat s JOIN Flight f ON f.FlightID = s.FlightID
           LEFT JOIN Booking bk ON bk.SeatID = s.SeatID AND bk.BookingStatus <> 'Cancelled'
           LEFT JOIN Passenger bp ON bp.PassengerID = bk.PassengerID`,
    select: `s.*, f.FlightNumber, f.SourceAirport, f.DestinationAirport, f.DepartureDate, f.TicketPrice,
             ROUND(f.TicketPrice * s.SeatPriceMultiplier, 2) AS SeatPrice,
             bk.BookingID, bk.BookingReference, CONCAT(bp.FirstName, ' ', bp.LastName) AS PassengerName`,
    search: ['s.SeatNumber', 'f.FlightNumber', 's.SeatClass', 'bk.BookingReference'],
    order: 's.FlightID, LENGTH(s.SeatNumber), s.SeatNumber',
    sortKeys: { SeatNumber: 'LENGTH(s.SeatNumber), s.SeatNumber' },
    filter: 'SeatStatus',
    groups: [
      ['Seat', ['FlightID', 'SeatNumber', 'SeatClass', 'SeatType', 'SeatPriceMultiplier', 'SeatStatus']],
      ['Position', ['WindowSeat', 'AisleSeat']],
      ['Comfort & power', ['Recliner', 'PowerOutlet', 'USBPort']],
      ['Maintenance', ['LastInspectedOn']],
    ],
    lookups: { FlightID: 'flights' },
    hints: {
      FlightID: { label: 'Flight', lockedOnEdit: true },
      SeatNumber: { transform: 'upper', placeholder: 'e.g. 12A' },
      SeatPriceMultiplier: { label: 'Price multiplier', hint: '1.00 = base fare' },
      SeatType: { label: 'Seat type' },
      SeatClass: { label: 'Cabin class' },
      WindowSeat: { label: 'Window seat' }, AisleSeat: { label: 'Aisle seat' },
      Recliner: { label: 'Recliner' }, PowerOutlet: { label: 'Power outlet' }, USBPort: { label: 'USB port' },
      LastInspectedOn: { label: 'Last inspected on' },
    },
  },

  bookings: {
    table: 'Booking', alias: 'b', pk: 'BookingID', singular: 'Booking', plural: 'Bookings',
    from: `Booking b JOIN Passenger p ON p.PassengerID = b.PassengerID
           JOIN Flight f ON f.FlightID = b.FlightID JOIN Seat s ON s.SeatID = b.SeatID
           LEFT JOIN Payment pay ON pay.BookingID = b.BookingID`,
    select: `b.*, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName, p.Email AS PassengerEmail,
             f.FlightNumber, f.AirlineName, f.SourceAirport, f.DestinationAirport, f.DepartureDate, f.DepartureTime,
             s.SeatNumber, s.SeatClass, pay.PaymentID, pay.PaymentStatus`,
    search: ['b.BookingReference', 'b.BookingID', 'p.FirstName', 'p.LastName', 'p.Email', 'f.FlightNumber', 's.SeatNumber', 'b.PassengerID'],
    order: 'b.BookingID DESC',
    sortKeys: { PassengerName: 'p.FirstName, p.LastName', Flight: 'f.FlightNumber', Departure: 'f.DepartureDate, f.DepartureTime', SeatNumber: 'LENGTH(s.SeatNumber), s.SeatNumber' },
    filter: 'BookingStatus',
    canCreate: 'wizard',
    groups: [
      ['Reservation', ['PassengerID', 'FlightID', 'SeatID', 'BookingReference', 'BookingStatus', 'NumberOfPassengers']],
      ['Channel & source', ['BookingChannel', 'CreatedBy', 'TravelInsurance', 'BookingDate', 'BookingTime']],
      ['Fare', ['CouponCode', 'Discount', 'Tax', 'TotalFare']],
    ],
    lookups: { PassengerID: 'passengers', FlightID: 'flights' },
    editable: ['BookingStatus', 'BookingChannel', 'TravelInsurance', 'CreatedBy'],
    hints: {
      PassengerID: { label: 'Passenger', lockedOnEdit: true },
      FlightID: { label: 'Flight', lockedOnEdit: true },
      SeatID: { label: 'Seat', lockedOnEdit: true, lookup: 'none' },
      BookingReference: { label: 'PNR' },
      NumberOfPassengers: { label: 'Passengers on booking' },
      CreatedBy: { label: 'Booked by', placeholder: 'e.g. Agent-01' },
      TravelInsurance: { label: 'Travel insurance' },
      TotalFare: { label: 'Total fare (₹)' }, Discount: { label: 'Discount (₹)' }, Tax: { label: 'Tax (₹)' },
    },
  },

  payments: {
    table: 'Payment', alias: 'pay', pk: 'PaymentID', singular: 'Payment', plural: 'Payments',
    from: `Payment pay JOIN Booking b ON b.BookingID = pay.BookingID
           JOIN Passenger p ON p.PassengerID = b.PassengerID JOIN Flight f ON f.FlightID = b.FlightID`,
    select: `pay.*, b.BookingReference, b.TotalFare AS BookingFare, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName, f.FlightNumber`,
    search: ['pay.TransactionID', 'pay.InvoiceNumber', 'b.BookingReference', 'p.FirstName', 'p.LastName', 'pay.PaymentID'],
    order: 'pay.PaymentID DESC',
    sortKeys: { PassengerName: 'p.FirstName, p.LastName' },
    filter: 'PaymentStatus',
    groups: [
      ['Booking & method', ['BookingID', 'PaymentMethod', 'PaymentStatus', 'PaymentDate']],
      ['Amounts', ['Amount', 'ConvenienceFee', 'GST', 'TotalAmount']],
      ['References', ['TransactionID', 'InvoiceNumber']],
    ],
    lookups: { BookingID: 'bookings:unpaid' },
    hints: {
      BookingID: { label: 'Booking', lockedOnEdit: true },
      Amount: { label: 'Booking amount (₹)', autoFill: true, hint: 'Defaults to the booking total' },
      ConvenienceFee: { label: 'Convenience fee (₹)' },
      GST: { label: 'GST (₹)' },
      TotalAmount: { label: 'Total charged (₹)', readonly: true, hint: 'Amount + fee + GST' },
      PaymentDate: { autoFill: true },
      TransactionID: { label: 'Transaction ID', transform: 'upper', autoFill: true, hint: 'Generated automatically if left empty' },
      InvoiceNumber: { label: 'Invoice number', transform: 'upper', autoFill: true, hint: 'Next number in sequence if left empty' },
    },
  },

  cancellations: {
    table: 'Cancellation', alias: 'c', pk: 'CancellationID', singular: 'Cancellation', plural: 'Cancellations',
    from: `Cancellation c JOIN Booking b ON b.BookingID = c.BookingID
           JOIN Passenger p ON p.PassengerID = b.PassengerID JOIN Flight f ON f.FlightID = b.FlightID`,
    select: `c.*, b.BookingReference, b.TotalFare, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName, f.FlightNumber`,
    search: ['b.BookingReference', 'p.FirstName', 'p.LastName', 'c.Reason', 'c.CancellationID', 'f.FlightNumber'],
    order: 'c.CancellationID DESC',
    sortKeys: { PassengerName: 'p.FirstName, p.LastName' },
    filter: 'RefundStatus',
    canDelete: false,
    createFields: ['BookingID', 'Reason', 'RefundMode', 'ProcessedBy', 'Remarks'],
    groups: [
      ['Cancellation', ['BookingID', 'CancellationDate', 'CancellationTime', 'Reason', 'CancellationStatus']],
      ['Refund', ['RefundAmount', 'CancellationCharges', 'RefundStatus', 'RefundMode', 'RefundDate']],
      ['Processing', ['ProcessedBy', 'ApprovedBy', 'Remarks']],
    ],
    lookups: { BookingID: 'bookings:cancellable' },
    hints: {
      BookingID: { label: 'Booking to cancel', lockedOnEdit: true },
      Reason: { span: 2, placeholder: 'Why is the booking being cancelled?' },
      RefundAmount: { label: 'Refund amount (₹)' },
      CancellationCharges: { label: 'Cancellation charges (₹)' },
      ProcessedBy: { placeholder: 'e.g. Agent-01' }, ApprovedBy: { placeholder: 'e.g. Supervisor-A' },
      Remarks: { span: 3 },
    },
  },

  reviews: {
    table: 'Review', alias: 'r', pk: 'ReviewID', singular: 'Review', plural: 'Reviews',
    from: `Review r JOIN Passenger p ON p.PassengerID = r.PassengerID JOIN Flight f ON f.FlightID = r.FlightID`,
    select: `r.*, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName, f.FlightNumber, f.AirlineName, f.SourceAirport, f.DestinationAirport`,
    search: ['p.FirstName', 'p.LastName', 'f.FlightNumber', 'r.ReviewTitle', 'r.ReviewDescription', 'r.ReviewID'],
    order: 'r.ReviewID DESC',
    sortKeys: { PassengerName: 'p.FirstName, p.LastName' },
    filter: 'ReviewStatus',
    groups: [
      ['Who & what', ['PassengerID', 'FlightID', 'ReviewDate', 'ReviewStatus']],
      ['Overall', ['Rating', 'ReviewTitle', 'ReviewDescription', 'Recommend']],
      ['Experience ratings', ['CabinCleanliness', 'FoodRating', 'StaffBehavior', 'Comfort', 'Entertainment']],
    ],
    lookups: { PassengerID: 'passengers', FlightID: 'flights:reviewable' },
    hints: {
      PassengerID: { label: 'Passenger', lockedOnEdit: true },
      FlightID: { label: 'Flight', lockedOnEdit: true, hint: 'Only flights this passenger has booked' },
      Rating: { type: 'rating', label: 'Overall rating' },
      ReviewTitle: { span: 3 },
      ReviewDescription: { type: 'textarea', span: 3, label: 'Review' },
      CabinCleanliness: { type: 'rating', label: 'Cabin cleanliness' },
      FoodRating: { type: 'rating', label: 'Food' },
      StaffBehavior: { type: 'rating', label: 'Staff behaviour' },
      Comfort: { type: 'rating' }, Entertainment: { type: 'rating' },
      Recommend: { label: 'Would recommend' },
      ReviewDate: { autoFill: true },
    },
  },

  baggage: {
    table: 'Baggage', alias: 'g', pk: 'BaggageID', singular: 'Baggage record', plural: 'Baggage', slug: 'baggage',
    from: `Baggage g JOIN Booking b ON b.BookingID = g.BookingID
           JOIN Passenger p ON p.PassengerID = b.PassengerID JOIN Flight f ON f.FlightID = b.FlightID`,
    select: `g.*, b.BookingReference, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName, f.FlightNumber, f.SourceAirport, f.DestinationAirport`,
    search: ['g.TagNumber', 'b.BookingReference', 'p.FirstName', 'p.LastName', 'f.FlightNumber', 'g.BaggageID'],
    order: 'g.BaggageID DESC',
    sortKeys: { PassengerName: 'p.FirstName, p.LastName' },
    filter: 'BaggageStatus',
    groups: [
      ['Booking & tag', ['BookingID', 'TagNumber', 'BaggageType', 'NumberOfBags', 'SpecialHandling']],
      ['Weight & charges', ['BagWeight', 'AllowedWeight', 'ExtraWeight', 'ExtraCharge']],
      ['Handling', ['BaggageStatus', 'CollectionStatus', 'CheckInTime']],
    ],
    lookups: { BookingID: 'bookings:active' },
    hints: {
      BookingID: { label: 'Booking', lockedOnEdit: true },
      TagNumber: { label: 'Tag number', transform: 'upper', autoFill: true, hint: 'Generated automatically if left empty' },
      BagWeight: { label: 'Total bag weight (kg)' },
      AllowedWeight: { label: 'Allowed weight (kg)' },
      ExtraWeight: { label: 'Excess weight (kg)', readonly: true, hint: 'Weight above the allowance' },
      ExtraCharge: { label: 'Excess charge (₹)', readonly: true, hint: '₹500 per extra kg' },
      CheckInTime: { label: 'Check-in time', autoFill: true },
    },
  },
};

for (const [key, e] of Object.entries(ENTITIES)) {
  e.key = key;
  e.slug = e.slug || key;
  e.lookups = e.lookups || {};
  e.hints = e.hints || {};
  e.canDelete = e.canDelete !== false;
}

function localToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function labelOf(name) {
  const words = spaced(name).split(' ');
  return words.map((w, i) => {
    if (w === w.toUpperCase() && w.length > 1) return w;       // DOB, GST, USB, ID
    const lw = w.toLowerCase();
    return i === 0 ? lw[0].toUpperCase() + lw.slice(1) : lw;
  }).join(' ');
}

const UPLOAD_SKIP = new Set(['CreatedAt']);

/** Merge live column info with presentation hints -> what the browser receives. */
async function buildClientMeta() {
  const schema = await getSchema();
  const entities = {};
  for (const e of Object.values(ENTITIES)) {
    const t = schema.tables[e.table];
    const grouped = new Map();
    const place = (title, col) => {
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title).push(col);
    };
    const listed = new Set(e.groups.flatMap(([, cols]) => cols));
    const fields = [];
    for (const c of t.columns) {
      if (c.pk && c.auto) continue;
      if (UPLOAD_SKIP.has(c.name) || c.kind === 'timestamp') continue;
      const h = e.hints[c.name] || {};
      const lookupKind = h.lookup === 'none' ? null : e.lookups[c.name] || null;
      fields.push({
        name: c.name,
        label: h.label || labelOf(c.name),
        kind: c.kind,
        type: h.type || (c.kind === 'enum' ? 'select' : c.kind === 'bool' ? 'switch' : c.kind === 'int' || c.kind === 'decimal' ? 'number' : c.kind === 'date' ? 'date' : c.kind === 'time' ? 'time' : 'text'),
        required: !c.nullable && !c.hasDefault && !h.autoFill && !h.hideOnCreate,
        autoFill: !!h.autoFill,
        notNull: !c.nullable,
        options: c.options || null,
        maxLength: h.maxLength || c.maxLength || null,
        step: c.kind === 'decimal' ? (c.scale ? 1 / 10 ** c.scale : 1) : null,
        default: c.default,
        readonly: !!h.readonly,
        lockedOnEdit: !!h.lockedOnEdit || (e.editable ? !e.editable.includes(c.name) : false),
        hideOnCreate: !!h.hideOnCreate,
        span: h.span || 1,
        hint: h.hint || null,
        placeholder: h.placeholder || null,
        datalist: h.datalist || null,
        transform: h.transform || null,
        lookup: lookupKind,
      });
      const g = e.groups.find(([, cols]) => cols.includes(c.name));
      place(g ? g[0] : 'Other details', c.name);
      void listed;
    }
    // keep the group order given above, then "Other details"
    const order = [...e.groups.map(([title]) => title), 'Other details'];
    const groups = order.filter((t2) => grouped.has(t2)).map((title) => {
      const cols = grouped.get(title);
      const hinted = e.groups.find(([tt]) => tt === title);
      if (hinted) cols.sort((a, b) => hinted[1].indexOf(a) - hinted[1].indexOf(b));
      return { title, fields: cols };
    });
    entities[e.key] = {
      key: e.key, slug: e.slug, table: e.table, pk: e.pk,
      singular: e.singular, plural: e.plural,
      fields, groups,
      filter: e.filter ? { column: e.filter, options: t.byName[e.filter].options } : null,
      createFields: e.createFields || null,
      canCreate: e.canCreate === undefined ? true : e.canCreate,
      canDelete: e.canDelete,
    };
  }
  return {
    entities,
    pricing: PRICING,
    airports: AIRPORTS,
    today: localToday(),
  };
}

module.exports = { ENTITIES, buildClientMeta, labelOf };
