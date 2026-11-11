'use strict';
/**
 * Business rules for fares, coupons, payment fees and baggage.
 * The numbers mirror the sample data and stored procedure in the SQL script:
 *   - Fare   = TicketPrice x SeatPriceMultiplier x NumberOfPassengers   (sp_BookSeat)
 *   - Tax    = 12 % of the fare after discount                          (sp_BookSeat uses 12 %)
 *   - GST    = 5 % of the booking amount on the payment                 (sample payments)
 *   - Excess baggage = 500 per kg over the allowance                    (sample baggage)
 * The same constants are sent to the browser (/api/meta) so the live price summary
 * on screen always matches what the server stores.
 */
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const PRICING = {
  TAX_RATE: 0.12,
  GST_RATE: 0.05,
  EXCESS_BAGGAGE_RATE: 500,
  MAX_PASSENGERS: 9,
  COUPONS: {
    WELCOME5: { pct: 5, label: 'Welcome offer' },
    FLY10: { pct: 10, label: 'Fly more, pay less' },
    SAVE15: { pct: 15, label: 'Seasonal saver' },
    FESTIVE20: { pct: 20, label: 'Festive special' },
  },
  // Convenience fee, % of the booking amount, by payment method
  CONVENIENCE_PCT: { 'Credit Card': 1.0, 'Debit Card': 0.5, UPI: 0, 'Net Banking': 0.75, Wallet: 0.5 },
  // Free baggage allowance (kg) by cabin
  FREE_BAGGAGE_KG: { First: 40, Business: 32, 'Premium Economy': 25, Economy: 20 },
};

function findCoupon(code) {
  if (!code) return null;
  const c = PRICING.COUPONS[String(code).trim().toUpperCase()];
  return c ? { code: String(code).trim().toUpperCase(), ...c } : null;
}

function quote({ ticketPrice, multiplier, pax, couponCode }) {
  const n = Math.max(1, Number(pax) || 1);
  const baseFare = r2(Number(ticketPrice) * Number(multiplier) * n);
  const coupon = findCoupon(couponCode);
  const discount = coupon ? r2(baseFare * coupon.pct / 100) : 0;
  const taxable = r2(baseFare - discount);
  const tax = r2(taxable * PRICING.TAX_RATE);
  const total = r2(taxable + tax);
  return { baseFare, discount, taxable, tax, total, coupon };
}

function paymentBreakdown({ amount, method, convenienceFee }) {
  const pct = PRICING.CONVENIENCE_PCT[method] ?? 0;
  const fee = convenienceFee === undefined || convenienceFee === null || convenienceFee === ''
    ? r2(amount * pct / 100) : r2(convenienceFee);
  const gst = r2(amount * PRICING.GST_RATE);
  return { convenienceFee: fee, gst, totalAmount: r2(Number(amount) + fee + gst) };
}

function baggageCharges({ bagWeight, allowedWeight }) {
  const extraWeight = r2(Math.max(0, Number(bagWeight) - Number(allowedWeight)));
  return { extraWeight, extraCharge: r2(extraWeight * PRICING.EXCESS_BAGGAGE_RATE) };
}

module.exports = { PRICING, r2, findCoupon, quote, paymentBreakdown, baggageCharges };
