'use strict';

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

const CHECKS = {
  chk_passenger_flights: ['FlightsTaken', 'Flights taken cannot be negative.'],
  chk_flight_route: ['DestinationAirport', 'Source and destination airports must be different.'],
  chk_flight_price: ['TicketPrice', 'Ticket price must be greater than 0.'],
  chk_flight_seats: ['AvailableSeats', 'Available seats cannot exceed total seats.'],
  chk_flight_distance: ['DistanceKM', 'Distance must be greater than 0.'],
  chk_flight_crew: ['CabinCrewCount', 'Cabin crew count cannot be negative.'],
  chk_seat_multiplier: ['SeatPriceMultiplier', 'Price multiplier must be greater than 0.'],
  chk_booking_pax: ['NumberOfPassengers', 'Number of passengers must be at least 1.'],
  chk_booking_fare: ['TotalFare', 'Total fare cannot be negative.'],
  chk_booking_discount: ['Discount', 'Discount cannot be negative.'],
  chk_booking_tax: ['Tax', 'Tax cannot be negative.'],
  chk_booking_total_fare_nonneg: ['TotalFare', 'Total fare cannot be negative.'],
  chk_payment_amount: ['Amount', 'Amount cannot be negative.'],
  chk_payment_total: ['TotalAmount', 'Total amount cannot be negative.'],
  chk_cancellation_refund: ['RefundAmount', 'Refund amount cannot be negative.'],
  chk_cancellation_charge: ['CancellationCharges', 'Cancellation charges cannot be negative.'],
  chk_review_rating: ['Rating', 'Rating must be between 1 and 5.'],
  chk_review_cleanliness: ['CabinCleanliness', 'Cabin cleanliness must be between 1 and 5.'],
  chk_review_food: ['FoodRating', 'Food rating must be between 1 and 5.'],
  chk_review_staff: ['StaffBehavior', 'Staff behaviour must be between 1 and 5.'],
  chk_review_comfort: ['Comfort', 'Comfort must be between 1 and 5.'],
  chk_review_entertainment: ['Entertainment', 'Entertainment must be between 1 and 5.'],
  chk_baggage_weight: ['BagWeight', 'Bag weight cannot be negative.'],
  chk_baggage_bags: ['NumberOfBags', 'Number of bags must be at least 1.'],
};

const FKS = {
  fk_booking_passenger: ['PassengerID', 'That passenger does not exist.'],
  fk_booking_flight: ['FlightID', 'That flight does not exist.'],
  fk_booking_seat: ['SeatID', 'That seat does not exist.'],
  fk_seat_flight: ['FlightID', 'That flight does not exist.'],
  fk_payment_booking: ['BookingID', 'That booking does not exist.'],
  fk_cancellation_booking: ['BookingID', 'That booking does not exist.'],
  fk_review_passenger: ['PassengerID', 'That passenger does not exist.'],
  fk_review_flight: ['FlightID', 'That flight does not exist.'],
  fk_baggage_booking: ['BookingID', 'That booking does not exist.'],
};

const spaced = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

/** Turn a raw MySQL error into something a person can act on. */
function friendly(err, schema) {
  if (err instanceof HttpError) return err;
  const msg = err.sqlMessage || err.message || 'Unexpected error';
  switch (err.errno) {
    case 1062: { // duplicate
      const m = /for key '([^']+)'/i.exec(msg);
      const key = m ? m[1].split('.').pop() : '';
      const val = (/Duplicate entry '([^']*)'/i.exec(msg) || [])[1];
      const u = schema && schema.uniques[key];
      const col = u ? u.columns[u.columns.length > 1 ? 0 : 0] : null;
      const label = u ? u.columns.map(spaced).join(' + ') : 'value';
      const text = `${label}${val ? ` "${val}"` : ''} is already in use. Please enter a different one.`;
      return new HttpError(409, text, col ? { [col]: text } : null);
    }
    case 4025: case 3819: { // check constraint (MariaDB / MySQL)
      const m = /(chk_[a-z0-9_]+)/i.exec(msg);
      const hit = m && CHECKS[m[1].toLowerCase()];
      return new HttpError(400, hit ? hit[1] : 'A value is outside the allowed range.', hit ? { [hit[0]]: hit[1] } : null);
    }
    case 1452: { // FK parent missing
      const m = /CONSTRAINT `?(fk_[a-z0-9_]+)`?/i.exec(msg);
      const hit = m && FKS[m[1].toLowerCase()];
      return new HttpError(400, hit ? hit[1] : 'A referenced record does not exist.', hit ? { [hit[0]]: hit[1] } : null);
    }
    case 1451:
      return new HttpError(409, 'This record is still referenced by other records.');
    case 1048: {
      const col = (/Column '([^']+)'/.exec(msg) || [])[1];
      return new HttpError(400, `${spaced(col || 'A required field')} is required.`, col ? { [col]: 'Required' } : null);
    }
    case 1265: case 1366: case 1292: case 1411:
      return new HttpError(400, 'One of the values has an invalid format.');
    case 1406:
      return new HttpError(400, 'One of the values is too long.');
    case 1644: // SIGNAL SQLSTATE '45000' raised by our triggers / procedures
      return new HttpError(409, err.sqlMessage);
    case 1213: case 1205:
      return new HttpError(409, 'The database was busy. Please try again.');
    default:
      if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ENOTFOUND') {
        return new HttpError(503, 'Cannot connect to the MySQL database. Check the .env file and that MySQL is running.');
      }
      return err;
  }
}

module.exports = { HttpError, friendly, spaced };
