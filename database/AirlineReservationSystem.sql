-- =====================================================================================
-- FILE        : AirlineReservationSystem.sql
-- PROJECT      : AIRLINE SEAT RESERVATION SYSTEM (College DBMS Project)
-- GENERATED ON : 2026-10-29
-- HOW TO RUN   : Open this file in MySQL Workbench (MySQL 8.0+) and execute the
--                entire script in one go (lightning-bolt icon / Ctrl+Shift+Enter).
--                No manual edits are required.
-- =====================================================================================

-- =====================================================================================
-- PROJECT      : AIRLINE SEAT RESERVATION SYSTEM
-- DATABASE     : AirlineReservationSystem
-- ENGINE       : MySQL 8.0+
-- ID SCHEME    : Passenger 100001+, Flight 20001+, Seat 300001+, Review 400001+,
--                Booking 500001+, Payment 700001+, Baggage 800001+, Cancellation 900001+
-- DESCRIPTION  : Enterprise-grade relational database for a full airline seat
--                reservation platform covering passengers, flights, seat inventory,
--                bookings, payments, cancellations, reviews and baggage handling.
-- AUTHOR       : Database Architecture Team
-- =====================================================================================

-- =====================================================================================
-- SECTION 1: DATABASE INITIALIZATION
-- =====================================================================================

DROP DATABASE IF EXISTS AirlineReservationSystem;
CREATE DATABASE AirlineReservationSystem
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE AirlineReservationSystem;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';

-- =====================================================================================
-- SECTION 2: TABLE DEFINITIONS
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- TABLE 1: PASSENGER
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Passenger;
CREATE TABLE Passenger (
    PassengerID              INT AUTO_INCREMENT PRIMARY KEY,
    FirstName                VARCHAR(50)  NOT NULL,
    MiddleName               VARCHAR(50)  DEFAULT NULL,
    LastName                 VARCHAR(50)  NOT NULL,
    Gender                   ENUM('Male','Female','Other') NOT NULL,
    DOB                      DATE NOT NULL,
    Email                    VARCHAR(100) NOT NULL,
    Phone                    VARCHAR(20)  NOT NULL,
    PassportNumber           VARCHAR(20)  NOT NULL,
    Nationality               VARCHAR(50)  NOT NULL,
    Address                  VARCHAR(150) NOT NULL,
    City                     VARCHAR(50)  NOT NULL,
    State                    VARCHAR(50)  NOT NULL,
    Country                  VARCHAR(50)  NOT NULL,
    ZipCode                  VARCHAR(10)  NOT NULL,
    FrequentFlyerMembership  ENUM('None','Silver','Gold','Platinum') NOT NULL DEFAULT 'None',
    FlightsTaken             INT NOT NULL DEFAULT 0,
    MealPreference           ENUM('Veg','Non-Veg','Vegan','Jain','No Preference') NOT NULL DEFAULT 'No Preference',
    SeatPreference           ENUM('Window','Aisle','Middle','No Preference') NOT NULL DEFAULT 'No Preference',
    EmergencyContact         VARCHAR(20)  DEFAULT NULL,
    GovernmentID             VARCHAR(30)  NOT NULL,
    CreatedAt                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_passenger_email     UNIQUE (Email),
    CONSTRAINT uq_passenger_phone     UNIQUE (Phone),
    CONSTRAINT uq_passenger_passport  UNIQUE (PassportNumber),
    CONSTRAINT uq_passenger_govtid    UNIQUE (GovernmentID),
    CONSTRAINT chk_passenger_flights  CHECK (FlightsTaken >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=100001;

CREATE INDEX idx_passenger_name    ON Passenger (LastName, FirstName);
CREATE INDEX idx_passenger_country ON Passenger (Country);
CREATE INDEX idx_passenger_ffm     ON Passenger (FrequentFlyerMembership);

-- ---------------------------------------------------------------------------
-- TABLE 2: FLIGHT
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Flight;
CREATE TABLE Flight (
    FlightID              INT AUTO_INCREMENT PRIMARY KEY,
    FlightNumber          VARCHAR(10)  NOT NULL,
    AirlineName           VARCHAR(60)  NOT NULL,
    AircraftModel         VARCHAR(50)  NOT NULL,
    SourceAirport         VARCHAR(5)   NOT NULL,
    DestinationAirport    VARCHAR(5)   NOT NULL,
    DepartureDate         DATE NOT NULL,
    DepartureTime         TIME NOT NULL,
    ArrivalDate           DATE NOT NULL,
    ArrivalTime           TIME NOT NULL,
    Terminal               VARCHAR(10) DEFAULT NULL,
    Gate                   VARCHAR(10) DEFAULT NULL,
    DistanceKM             INT NOT NULL,
    TicketPrice             DECIMAL(10,2) NOT NULL,
    AvailableSeats          INT NOT NULL DEFAULT 0,
    TotalSeats               INT NOT NULL DEFAULT 0,
    FlightStatus             ENUM('Scheduled','Delayed','Cancelled','Departed','Arrived') NOT NULL DEFAULT 'Scheduled',
    PilotName                VARCHAR(100) NOT NULL,
    CabinCrewCount            INT NOT NULL DEFAULT 4,
    CreatedAt                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_flight_number       UNIQUE (FlightNumber, DepartureDate),
    CONSTRAINT chk_flight_route       CHECK (SourceAirport <> DestinationAirport),
    CONSTRAINT chk_flight_price       CHECK (TicketPrice > 0),
    CONSTRAINT chk_flight_seats       CHECK (AvailableSeats >= 0 AND AvailableSeats <= TotalSeats),
    CONSTRAINT chk_flight_distance    CHECK (DistanceKM > 0),
    CONSTRAINT chk_flight_crew        CHECK (CabinCrewCount >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=20001;

CREATE INDEX idx_flight_route  ON Flight (SourceAirport, DestinationAirport);
CREATE INDEX idx_flight_date   ON Flight (DepartureDate);
CREATE INDEX idx_flight_status ON Flight (FlightStatus);
CREATE INDEX idx_flight_airline ON Flight (AirlineName);

-- ---------------------------------------------------------------------------
-- TABLE 3: SEAT
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Seat;
CREATE TABLE Seat (
    SeatID                INT AUTO_INCREMENT PRIMARY KEY,
    FlightID              INT NOT NULL,
    SeatNumber            VARCHAR(5) NOT NULL,
    SeatClass             ENUM('Economy','Premium Economy','Business','First') NOT NULL,
    SeatType              ENUM('Standard','Extra Legroom','Emergency Exit','Bulkhead') NOT NULL DEFAULT 'Standard',
    SeatPriceMultiplier   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    SeatStatus            ENUM('Available','Booked','Blocked','Under Maintenance') NOT NULL DEFAULT 'Available',
    WindowSeat            BOOLEAN NOT NULL DEFAULT FALSE,
    AisleSeat             BOOLEAN NOT NULL DEFAULT FALSE,
    Recliner              BOOLEAN NOT NULL DEFAULT FALSE,
    PowerOutlet           BOOLEAN NOT NULL DEFAULT FALSE,
    USBPort               BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_seat_flight FOREIGN KEY (FlightID) REFERENCES Flight (FlightID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_seat_flight_number UNIQUE (FlightID, SeatNumber),
    CONSTRAINT chk_seat_multiplier CHECK (SeatPriceMultiplier > 0)
) ENGINE=InnoDB AUTO_INCREMENT=300001;

CREATE INDEX idx_seat_flight_status ON Seat (FlightID, SeatStatus);
CREATE INDEX idx_seat_class         ON Seat (SeatClass);

-- ---------------------------------------------------------------------------
-- TABLE 4: BOOKING
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Booking;
CREATE TABLE Booking (
    BookingID             INT AUTO_INCREMENT PRIMARY KEY,
    PassengerID           INT NOT NULL,
    FlightID              INT NOT NULL,
    SeatID                INT NOT NULL,
    BookingReference      VARCHAR(10) NOT NULL,
    BookingDate           DATE NOT NULL,
    BookingTime           TIME NOT NULL,
    NumberOfPassengers    INT NOT NULL DEFAULT 1,
    BookingStatus         ENUM('Confirmed','Pending','Cancelled','Completed') NOT NULL DEFAULT 'Confirmed',
    CouponCode            VARCHAR(20) DEFAULT NULL,
    Discount              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Tax                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    TotalFare              DECIMAL(10,2) NOT NULL,
    BookingChannel         ENUM('Website','Mobile App','Travel Agent','Airport Counter') NOT NULL DEFAULT 'Website',
    TravelInsurance         BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedBy               VARCHAR(50) NOT NULL DEFAULT 'System',
    CONSTRAINT fk_booking_passenger FOREIGN KEY (PassengerID) REFERENCES Passenger (PassengerID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_booking_flight FOREIGN KEY (FlightID) REFERENCES Flight (FlightID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_booking_seat FOREIGN KEY (SeatID) REFERENCES Seat (SeatID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_booking_reference UNIQUE (BookingReference),
    CONSTRAINT chk_booking_pax      CHECK (NumberOfPassengers > 0),
    CONSTRAINT chk_booking_fare     CHECK (TotalFare >= 0),
    CONSTRAINT chk_booking_discount CHECK (Discount >= 0),
    CONSTRAINT chk_booking_tax      CHECK (Tax >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=500001;

CREATE INDEX idx_booking_passenger ON Booking (PassengerID);
CREATE INDEX idx_booking_flight    ON Booking (FlightID);
-- NOTE: SeatID is intentionally NOT unique. A cancelled booking keeps its SeatID for history,
-- and the seat must be bookable again. Double-booking is prevented by trg_booking_before_insert
-- (seat must not already be 'Booked') plus the row lock taken in sp_BookSeat.
CREATE INDEX idx_booking_seat      ON Booking (SeatID);
CREATE INDEX idx_booking_status    ON Booking (BookingStatus);

-- ---------------------------------------------------------------------------
-- TABLE 5: PAYMENT
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Payment;
CREATE TABLE Payment (
    PaymentID           INT AUTO_INCREMENT PRIMARY KEY,
    BookingID           INT NOT NULL,
    PaymentMethod       ENUM('Credit Card','Debit Card','UPI','Net Banking','Wallet') NOT NULL,
    Amount              DECIMAL(10,2) NOT NULL,
    ConvenienceFee      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    GST                 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    TotalAmount         DECIMAL(10,2) NOT NULL,
    TransactionID       VARCHAR(30) NOT NULL,
    PaymentStatus       ENUM('Success','Failed','Pending','Refunded') NOT NULL DEFAULT 'Pending',
    PaymentDate         DATE NOT NULL,
    InvoiceNumber       VARCHAR(20) NOT NULL,
    CONSTRAINT fk_payment_booking FOREIGN KEY (BookingID) REFERENCES Booking (BookingID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_payment_transaction UNIQUE (TransactionID),
    CONSTRAINT uq_payment_invoice     UNIQUE (InvoiceNumber),
    CONSTRAINT uq_payment_booking     UNIQUE (BookingID),
    CONSTRAINT chk_payment_amount     CHECK (Amount >= 0),
    CONSTRAINT chk_payment_total      CHECK (TotalAmount >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=700001;

CREATE INDEX idx_payment_status ON Payment (PaymentStatus);
CREATE INDEX idx_payment_date   ON Payment (PaymentDate);
CREATE INDEX idx_payment_method ON Payment (PaymentMethod);

-- ---------------------------------------------------------------------------
-- TABLE 6: CANCELLATION
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Cancellation;
CREATE TABLE Cancellation (
    CancellationID        INT AUTO_INCREMENT PRIMARY KEY,
    BookingID              INT NOT NULL,
    CancellationDate        DATE NOT NULL,
    CancellationTime        TIME NOT NULL,
    Reason                  VARCHAR(150) NOT NULL,
    RefundAmount             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CancellationCharges      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    RefundStatus             ENUM('Pending','Processed','Rejected') NOT NULL DEFAULT 'Pending',
    CancellationStatus       ENUM('Requested','Approved','Rejected','Completed') NOT NULL DEFAULT 'Requested',
    ProcessedBy              VARCHAR(50) DEFAULT NULL,
    RefundDate                DATE DEFAULT NULL,
    Remarks                   VARCHAR(150) DEFAULT NULL,
    RefundMode                 ENUM('Original Payment Method','Wallet','Bank Transfer') NOT NULL DEFAULT 'Original Payment Method',
    ApprovedBy                  VARCHAR(50) DEFAULT NULL,
    CreatedAt                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cancellation_booking FOREIGN KEY (BookingID) REFERENCES Booking (BookingID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_cancellation_booking UNIQUE (BookingID),
    CONSTRAINT chk_cancellation_refund CHECK (RefundAmount >= 0),
    CONSTRAINT chk_cancellation_charge CHECK (CancellationCharges >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=900001;

CREATE INDEX idx_cancellation_status ON Cancellation (CancellationStatus);
CREATE INDEX idx_cancellation_date   ON Cancellation (CancellationDate);

-- ---------------------------------------------------------------------------
-- TABLE 7: REVIEW
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Review;
CREATE TABLE Review (
    ReviewID             INT AUTO_INCREMENT PRIMARY KEY,
    PassengerID          INT NOT NULL,
    FlightID             INT NOT NULL,
    Rating               INT NOT NULL,
    ReviewTitle          VARCHAR(100) NOT NULL,
    ReviewDescription    VARCHAR(400) NOT NULL,
    CabinCleanliness     INT NOT NULL,
    FoodRating           INT NOT NULL,
    StaffBehavior        INT NOT NULL,
    Comfort              INT NOT NULL,
    Entertainment        INT NOT NULL,
    Recommend            BOOLEAN NOT NULL DEFAULT TRUE,
    ReviewDate           DATE NOT NULL,
    ReviewStatus         ENUM('Published','Pending','Flagged') NOT NULL DEFAULT 'Published',
    CreatedAt            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_passenger FOREIGN KEY (PassengerID) REFERENCES Passenger (PassengerID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_review_flight FOREIGN KEY (FlightID) REFERENCES Flight (FlightID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_review_rating       CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_cleanliness  CHECK (CabinCleanliness BETWEEN 1 AND 5),
    CONSTRAINT chk_review_food         CHECK (FoodRating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_staff        CHECK (StaffBehavior BETWEEN 1 AND 5),
    CONSTRAINT chk_review_comfort      CHECK (Comfort BETWEEN 1 AND 5),
    CONSTRAINT chk_review_entertainment CHECK (Entertainment BETWEEN 1 AND 5)
) ENGINE=InnoDB AUTO_INCREMENT=400001;

CREATE INDEX idx_review_flight ON Review (FlightID);
CREATE INDEX idx_review_rating ON Review (Rating);

-- ---------------------------------------------------------------------------
-- TABLE 8: BAGGAGE
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Baggage;
CREATE TABLE Baggage (
    BaggageID            INT AUTO_INCREMENT PRIMARY KEY,
    BookingID            INT NOT NULL,
    BagWeight            DECIMAL(5,2) NOT NULL,
    AllowedWeight        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    ExtraWeight          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    ExtraCharge          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    NumberOfBags          INT NOT NULL DEFAULT 1,
    BaggageStatus          ENUM('Checked-In','Loaded','In Transit','Delivered','Lost') NOT NULL DEFAULT 'Checked-In',
    TagNumber               VARCHAR(20) NOT NULL,
    CheckInTime              TIME NOT NULL,
    CollectionStatus          ENUM('Not Collected','Collected') NOT NULL DEFAULT 'Not Collected',
    SpecialHandling            ENUM('None','Fragile','Priority') NOT NULL DEFAULT 'None',
    BaggageType                 ENUM('Checked','Cabin') NOT NULL DEFAULT 'Checked',
    CreatedAt                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_baggage_booking FOREIGN KEY (BookingID) REFERENCES Booking (BookingID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_baggage_tag  UNIQUE (TagNumber),
    CONSTRAINT chk_baggage_weight CHECK (BagWeight >= 0),
    CONSTRAINT chk_baggage_bags   CHECK (NumberOfBags > 0)
) ENGINE=InnoDB AUTO_INCREMENT=800001;

CREATE INDEX idx_baggage_status ON Baggage (BaggageStatus);
CREATE INDEX idx_baggage_booking ON Baggage (BookingID);

SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================================================
-- SECTION 3: SAMPLE DATA
-- =====================================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 3.1 PASSENGER (50 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Passenger (PassengerID, FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber, Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership, FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID) VALUES
    (100001, 'Krishna', NULL, 'Agarwal', 'Male', '1972-07-26', 'krishna.agarwal1@mailhub.com', '+919459164303', 'R8400346', 'Indian', '629 Church Street', 'Mumbai', 'Maharashtra', 'India', '216115', 'Platinum', 18, 'Veg', 'No Preference', '+917049344153', 'GOV00001345'),
    (100002, 'Ethan', 'Lee', 'Taylor', 'Male', '1956-07-24', 'ethan.taylor2@mailhub.com', '+18500809013', 'C6710873', 'French', '551 Marine Drive', 'Paris', 'Ile-de-France', 'France', '47696', 'None', 29, 'No Preference', 'Middle', '+917106254486', 'GOV00002191'),
    (100003, 'Diya', NULL, 'Bose', 'Female', '1972-08-28', 'diya.bose3@mailhub.com', '+917500140108', 'P9495290', 'Indian', '897 Station Road', 'Dubai', 'Dubai', 'UAE', '62186', 'Platinum', 33, 'Jain', 'No Preference', '+919203100991', 'GOV00003921'),
    (100004, 'Daniel', NULL, 'Johnson', 'Male', '1968-07-16', 'daniel.johnson4@mailhub.com', '+12611657276', 'H3047042', 'British', '468 Station Road', 'Toronto', 'Ontario', 'Canada', '81517', 'Silver', 16, 'Jain', 'Middle', '+919354280031', 'GOV00004741'),
    (100005, 'Zoe', NULL, 'Davis', 'Female', '1990-01-02', 'zoe.davis5@mailhub.com', '+16938541290', 'Q9772618', 'German', '944 FC Road', 'Chandigarh', 'Punjab', 'India', '372745', 'Platinum', 44, 'Jain', 'No Preference', '+918865001457', 'GOV00005601'),
    (100006, 'Lily', NULL, 'Brown', 'Female', '1962-09-09', 'lily.brown6@mailhub.com', '+18240246890', 'F8143344', 'Singaporean', '491 Church Street', 'Tokyo', 'Tokyo', 'Japan', '95006', 'Silver', 17, 'Vegan', 'Window', '+917835743132', 'GOV00006962'),
    (100007, 'Aditya', 'Ann', 'Sharma', 'Male', '1970-09-27', 'aditya.sharma7@mailhub.com', '+917356763887', 'G5158025', 'Indian', '46 Civil Lines', 'Dubai', 'Dubai', 'UAE', '45197', 'Platinum', 42, 'Non-Veg', 'Window', '+918346226283', 'GOV00007223'),
    (100008, 'Jack', NULL, 'Wilson', 'Male', '1999-10-23', 'jack.wilson8@mailhub.com', '+14167761861', 'C8009167', 'Singaporean', '958 Linking Road', 'Kolkata', 'West Bengal', 'India', '921494', 'Platinum', 37, 'No Preference', 'No Preference', '+918676786620', 'GOV00008784'),
    (100009, 'Dhruv', 'Kumar', 'Sharma', 'Male', '1983-02-02', 'dhruv.sharma9@mailhub.com', '+918490430276', 'M1432688', 'Indian', '488 Oxford Street', 'Manchester', 'England', 'UK', '99495', 'Silver', 19, 'Vegan', 'Window', '+919137045498', 'GOV00009126'),
    (100010, 'Arjun', NULL, 'Menon', 'Male', '1994-07-20', 'arjun.menon10@mailhub.com', '+918444908030', 'Q4914569', 'Indian', '72 Civil Lines', 'Toronto', 'Ontario', 'Canada', '62318', 'None', 2, 'Non-Veg', 'Window', '+919784130073', 'GOV00010794');
INSERT INTO Passenger (PassengerID, FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber, Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership, FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID) VALUES
    (100011, 'Rahul', NULL, 'Trivedi', 'Male', '2006-03-21', 'rahul.trivedi11@mailhub.com', '+919276060179', 'G9671348', 'Indian', '678 Camac Street', 'Kolkata', 'West Bengal', 'India', '508914', 'Silver', 17, 'No Preference', 'No Preference', '+917337837039', 'GOV00011241'),
    (100012, 'Myra', 'Ann', 'Kumar', 'Female', '1976-07-10', 'myra.kumar12@mailhub.com', '+919008757844', 'F6465836', 'Indian', '456 Residency Road', 'London', 'England', 'UK', '79107', 'Platinum', 33, 'Veg', 'Aisle', '+917993575479', 'GOV00012631'),
    (100013, 'Victoria', 'Kumar', 'White', 'Female', '1985-03-12', 'victoria.white13@mailhub.com', '+18708749844', 'G2840351', 'Canadian', '288 Civil Lines', 'Toronto', 'Ontario', 'Canada', '84454', 'Silver', 13, 'Vegan', 'Middle', '+919878948192', 'GOV00013735'),
    (100014, 'Ishita', 'Rani', 'Kapoor', 'Female', '2001-11-02', 'ishita.kapoor14@mailhub.com', '+918530096584', 'F2783754', 'Indian', '284 Model Town', 'Kochi', 'Kerala', 'India', '978068', 'None', 4, 'Vegan', 'Aisle', '+918120377884', 'GOV00014618'),
    (100015, 'Sonal', 'Lee', 'Choudhary', 'Female', '1981-01-02', 'sonal.choudhary15@mailhub.com', '+917414249230', 'H1385501', 'Indian', '97 Civil Lines', 'Bengaluru', 'Karnataka', 'India', '704484', 'None', 22, 'Jain', 'Window', '+918735985196', 'GOV00015417'),
    (100016, 'Sneha', 'Kumar', 'Chauhan', 'Female', '1964-06-28', 'sneha.chauhan16@mailhub.com', '+919152902972', 'J7527130', 'Indian', '60 Orchard Road', 'Chandigarh', 'Punjab', 'India', '124812', 'Gold', 18, 'Vegan', 'Middle', '+917525339929', 'GOV00016398'),
    (100017, 'Emma', 'Rani', 'Hall', 'Female', '1972-01-24', 'emma.hall17@mailhub.com', '+16282668924', 'F3058316', 'French', '129 Ring Road', 'Pune', 'Maharashtra', 'India', '471238', 'Platinum', 38, 'Veg', 'No Preference', '+919483037223', 'GOV00017221'),
    (100018, 'Pooja', NULL, 'Iyer', 'Female', '1981-11-08', 'pooja.iyer18@mailhub.com', '+917537764536', 'F1476760', 'Indian', '958 Civil Lines', 'Toronto', 'Ontario', 'Canada', '99620', 'Platinum', 35, 'Vegan', 'Aisle', '+917980351187', 'GOV00018777'),
    (100019, 'Sneha', 'Lee', 'Kumar', 'Female', '1999-11-19', 'sneha.kumar19@mailhub.com', '+917384171076', 'F1637682', 'Indian', '840 Sector 17', 'Manchester', 'England', 'UK', '54657', 'Platinum', 40, 'Veg', 'Window', '+919696630221', 'GOV00019765'),
    (100020, 'Ramesh', NULL, 'Desai', 'Male', '1998-12-28', 'ramesh.desai20@mailhub.com', '+918714011172', 'M4900916', 'Indian', '352 FC Road', 'Jaipur', 'Rajasthan', 'India', '492929', 'Silver', 22, 'Jain', 'No Preference', '+919892245552', 'GOV00020675');
INSERT INTO Passenger (PassengerID, FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber, Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership, FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID) VALUES
    (100021, 'Kavya', 'Kumar', 'Joshi', 'Female', '1985-09-23', 'kavya.joshi21@mailhub.com', '+918753750614', 'B3895290', 'Indian', '382 Civil Lines', 'Lucknow', 'Uttar Pradesh', 'India', '866517', 'None', 16, 'Veg', 'Window', '+919291002345', 'GOV00021186'),
    (100022, 'Olivia', NULL, 'Martin', 'Female', '1974-11-22', 'olivia.martin22@mailhub.com', '+16973760856', 'D2435068', 'Japanese', '399 Oxford Street', 'Tokyo', 'Tokyo', 'Japan', '81760', 'None', 16, 'Veg', 'Aisle', '+917696689449', 'GOV00022245'),
    (100023, 'Neha', 'Ann', 'Patel', 'Female', '1995-12-21', 'neha.patel23@mailhub.com', '+917040582402', 'R8090939', 'Indian', '175 Ring Road', 'Paris', 'Ile-de-France', 'France', '13868', 'None', 11, 'No Preference', 'Aisle', '+917704108340', 'GOV00023464'),
    (100024, 'Noah', 'Lee', 'Williams', 'Male', '1994-09-05', 'noah.williams24@mailhub.com', '+18869784816', 'H3122728', 'French', '497 Residency Road', 'Kochi', 'Kerala', 'India', '977841', 'Silver', 4, 'Vegan', 'Middle', '+919781187083', 'GOV00024208'),
    (100025, 'Ishita', NULL, 'Pillai', 'Female', '1992-06-22', 'ishita.pillai25@mailhub.com', '+918958220906', 'M2384950', 'Indian', '828 Station Road', 'New Delhi', 'Delhi', 'India', '915751', 'None', 19, 'Non-Veg', 'Aisle', '+918395873060', 'GOV00025170'),
    (100026, 'Priya', NULL, 'Saxena', 'Female', '1976-07-11', 'priya.saxena26@mailhub.com', '+917759106547', 'G8767968', 'Indian', '942 Fifth Avenue', 'Toronto', 'Ontario', 'Canada', '55888', 'Platinum', 26, 'No Preference', 'No Preference', '+917914293498', 'GOV00026325'),
    (100027, 'Karthik', 'Lee', 'Kumar', 'Male', '1954-02-11', 'karthik.kumar27@mailhub.com', '+918144419151', 'Q5422858', 'Indian', '642 Sector 17', 'Paris', 'Ile-de-France', 'France', '40709', 'None', 21, 'No Preference', 'Window', '+918150664795', 'GOV00027248'),
    (100028, 'Pooja', NULL, 'Sharma', 'Female', '1962-06-22', 'pooja.sharma28@mailhub.com', '+918759477159', 'L2593937', 'Indian', '931 Civil Lines', 'London', 'England', 'UK', '77723', 'Silver', 13, 'Vegan', 'Middle', '+917257832847', 'GOV00028795'),
    (100029, 'Ryan', 'Rani', 'Hall', 'Male', '1986-10-21', 'ryan.hall29@mailhub.com', '+14627282307', 'R9102014', 'German', '39 Brigade Road', 'Mumbai', 'Maharashtra', 'India', '767177', 'Gold', 7, 'Vegan', 'Middle', '+917076399155', 'GOV00029446'),
    (100030, 'Hannah', NULL, 'Williams', 'Female', '1958-01-04', 'hannah.williams30@mailhub.com', '+12669271985', 'H8775634', 'Australian', '690 Camac Street', 'Dubai', 'Dubai', 'UAE', '50559', 'Silver', 5, 'Jain', 'Aisle', '+917464096519', 'GOV00030311');
INSERT INTO Passenger (PassengerID, FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber, Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership, FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID) VALUES
    (100031, 'Ananya', NULL, 'Reddy', 'Female', '1961-09-08', 'ananya.reddy31@mailhub.com', '+919021940767', 'L6763948', 'Indian', '622 Station Road', 'Kochi', 'Kerala', 'India', '367753', 'Platinum', 31, 'Vegan', 'Window', '+919764229660', 'GOV00031455'),
    (100032, 'Lakshmi', 'Lee', 'Chatterjee', 'Female', '1954-08-07', 'lakshmi.chatterjee32@mailhub.com', '+918578579709', 'J9594862', 'Indian', '410 Marine Drive', 'Tokyo', 'Tokyo', 'Japan', '38612', 'Gold', 37, 'Jain', 'Window', '+919772210977', 'GOV00032962'),
    (100033, 'Ella', NULL, 'Young', 'Female', '1975-09-20', 'ella.young33@mailhub.com', '+13396283097', 'L6697697', 'British', '80 Civil Lines', 'Kolkata', 'West Bengal', 'India', '936689', 'Platinum', 11, 'Vegan', 'No Preference', '+919708154545', 'GOV00033468'),
    (100034, 'James', 'Rani', 'Clark', 'Male', '1980-09-28', 'james.clark34@mailhub.com', '+14261629669', 'G5541304', 'Australian', '501 Linking Road', 'Toronto', 'Ontario', 'Canada', '83254', 'Platinum', 43, 'Vegan', 'No Preference', '+919287941482', 'GOV00034894'),
    (100035, 'Ankit', 'Rani', 'Patel', 'Male', '1956-11-19', 'ankit.patel35@mailhub.com', '+917262327478', 'B5703780', 'Indian', '964 Camac Street', 'Lucknow', 'Uttar Pradesh', 'India', '245949', 'Silver', 17, 'Vegan', 'Aisle', '+918964063580', 'GOV00035908'),
    (100036, 'Gaurav', NULL, 'Reddy', 'Male', '1998-07-21', 'gaurav.reddy36@mailhub.com', '+919674902315', 'R1486701', 'Indian', '527 Fifth Avenue', 'Ahmedabad', 'Gujarat', 'India', '669110', 'Silver', 5, 'Jain', 'Aisle', '+918393731277', 'GOV00036407'),
    (100037, 'Oliver', 'Kumar', 'Smith', 'Male', '1985-10-28', 'oliver.smith37@mailhub.com', '+19321382952', 'J6515873', 'American', '168 Ring Road', 'Mumbai', 'Maharashtra', 'India', '300620', 'Silver', 5, 'Jain', 'Aisle', '+917733018210', 'GOV00037874'),
    (100038, 'Saanvi', 'Rani', 'Chatterjee', 'Female', '1973-07-24', 'saanvi.chatterjee38@mailhub.com', '+918817533629', 'Q7093336', 'Indian', '992 Marine Drive', 'Hyderabad', 'Telangana', 'India', '759917', 'Silver', 28, 'No Preference', 'No Preference', '+917394121669', 'GOV00038821'),
    (100039, 'William', 'Kumar', 'Moore', 'Male', '1996-04-21', 'william.moore39@mailhub.com', '+13862241519', 'P1511735', 'Canadian', '664 Sector 17', 'Chennai', 'Tamil Nadu', 'India', '401063', 'Silver', 23, 'Veg', 'No Preference', '+919237753097', 'GOV00039660'),
    (100040, 'Ella', NULL, 'Jones', 'Female', '1998-09-08', 'ella.jones40@mailhub.com', '+16164706800', 'Q7331759', 'British', '608 Park Street', 'Singapore', 'Singapore', 'Singapore', '97821', 'Platinum', 35, 'Vegan', 'Window', '+918979929143', 'GOV00040723');
INSERT INTO Passenger (PassengerID, FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber, Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership, FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID) VALUES
    (100041, 'Yash', 'Lee', 'Kumar', 'Male', '2005-02-19', 'yash.kumar41@mailhub.com', '+917179844212', 'C9852288', 'Indian', '112 Rue de Rivoli', 'Frankfurt', 'Hesse', 'Germany', '94602', 'Platinum', 36, 'No Preference', 'No Preference', '+919322644410', 'GOV00041563'),
    (100042, 'Kavya', 'Kumar', 'Sharma', 'Female', '1982-02-06', 'kavya.sharma42@mailhub.com', '+919296807997', 'J1305940', 'Indian', '995 Church Street', 'Tokyo', 'Tokyo', 'Japan', '88899', 'Gold', 33, 'Vegan', 'Aisle', '+918318695380', 'GOV00042147'),
    (100043, 'Ritu', 'Ann', 'Iyer', 'Female', '1992-09-28', 'ritu.iyer43@mailhub.com', '+918342682117', 'P1692636', 'Indian', '610 Camac Street', 'Ahmedabad', 'Gujarat', 'India', '559824', 'Platinum', 12, 'Veg', 'No Preference', '+919536401517', 'GOV00043600'),
    (100044, 'Rahul', 'Ann', 'Nair', 'Male', '1961-01-17', 'rahul.nair44@mailhub.com', '+918998968924', 'E5943781', 'Indian', '322 Sector 17', 'Manchester', 'England', 'UK', '66585', 'Gold', 37, 'Vegan', 'Aisle', '+919277946209', 'GOV00044346'),
    (100045, 'Aniket', NULL, 'Gupta', 'Male', '1997-08-13', 'aniket.gupta45@mailhub.com', '+917476995173', 'D7977919', 'Indian', '251 FC Road', 'Mumbai', 'Maharashtra', 'India', '153595', 'Platinum', 16, 'Non-Veg', 'Middle', '+918607342382', 'GOV00045510'),
    (100046, 'Reyansh', NULL, 'Trivedi', 'Male', '1967-12-18', 'reyansh.trivedi46@mailhub.com', '+917496881971', 'Q1596825', 'Indian', '479 Ring Road', 'Toronto', 'Ontario', 'Canada', '92638', 'Platinum', 2, 'Non-Veg', 'No Preference', '+917201925145', 'GOV00046464'),
    (100047, 'Ishaan', 'Kumar', 'Nair', 'Male', '1989-10-21', 'ishaan.nair47@mailhub.com', '+917187281027', 'R5351032', 'Indian', '746 Civil Lines', 'Toronto', 'Ontario', 'Canada', '31967', 'Gold', 35, 'Jain', 'Window', '+919326458898', 'GOV00047173'),
    (100048, 'Kritika', 'Rani', 'Gupta', 'Female', '2005-01-14', 'kritika.gupta48@mailhub.com', '+918657158367', 'C8400983', 'Indian', '183 Camac Street', 'Dubai', 'Dubai', 'UAE', '41049', 'Silver', 10, 'Non-Veg', 'Middle', '+918717256867', 'GOV00048791'),
    (100049, 'Benjamin', 'Lee', 'Williams', 'Male', '2003-12-25', 'benjamin.williams49@mailhub.com', '+16854564404', 'H8958451', 'American', '153 Oxford Street', 'Toronto', 'Ontario', 'Canada', '33030', 'Gold', 31, 'Non-Veg', 'Window', '+918630125547', 'GOV00049991'),
    (100050, 'Zoe', NULL, 'Allen', 'Female', '1985-02-24', 'zoe.allen50@mailhub.com', '+19222646946', 'A5232716', 'French', '387 Brigade Road', 'Bengaluru', 'Karnataka', 'India', '418493', 'Gold', 38, 'Vegan', 'Window', '+917122630380', 'GOV00050343');

-- ---------------------------------------------------------------------------
-- 3.2 FLIGHT (30 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Flight (FlightID, FlightNumber, AirlineName, AircraftModel, SourceAirport, DestinationAirport, DepartureDate, DepartureTime, ArrivalDate, ArrivalTime, Terminal, Gate, DistanceKM, TicketPrice, AvailableSeats, TotalSeats, FlightStatus, PilotName, CabinCrewCount) VALUES
    (20001, 'UK199', 'Vistara', 'Boeing 737 MAX 8', 'LHR', 'HKG', '2026-10-02', '21:35:00', '2026-10-03', '01:17:00', 'T1', 'E34', 3108, 62170.08, 27, 30, 'Scheduled', 'Capt. Gaurav Miller', 8),
    (20002, 'UK120', 'Vistara', 'Airbus A321neo', 'SIN', 'AMD', '2026-10-27', '19:20:00', '2026-10-27', '22:54:00', 'T1', 'C29', 2782, 42205.18, 27, 30, 'Delayed', 'Capt. James Brown', 5),
    (20003, 'QR887', 'Qatar Airways', 'Airbus A350-900', 'AMD', 'LHR', '2026-10-27', '23:20:00', '2026-10-28', '04:36:00', 'T1', 'A40', 4108, 48804.99, 27, 30, 'Scheduled', 'Capt. Ishaan Miller', 12),
    (20004, '6E829', 'IndiGo', 'Airbus A350-900', 'PNQ', 'COK', '2026-12-07', '12:15:00', '2026-12-08', '01:03:00', 'T3', 'E26', 9216, 13117.57, 28, 30, 'Scheduled', 'Capt. Andrew Malhotra', 7),
    (20005, 'LH655', 'Lufthansa', 'Boeing 787-9 Dreamliner', 'FRA', 'COK', '2026-11-08', '12:55:00', '2026-11-08', '18:24:00', 'T1', 'E13', 3948, 56642.72, 28, 30, 'Scheduled', 'Capt. Kabir Joshi', 8),
    (20006, 'UK694', 'Vistara', 'Airbus A350-900', 'SIN', 'NRT', '2026-09-17', '14:30:00', '2026-09-18', '02:21:00', 'T3', 'C27', 9243, 45153.1, 29, 30, 'Cancelled', 'Capt. Ramesh Agarwal', 7),
    (20007, 'BA920', 'British Airways', 'ATR 72-600', 'CDG', 'COK', '2026-11-25', '19:40:00', '2026-11-26', '02:38:00', 'T2', 'E24', 5016, 49527.02, 29, 30, 'Scheduled', 'Capt. Rahul Malhotra', 7),
    (20008, 'BA464', 'British Airways', 'Boeing 737 MAX 8', 'HKG', 'DXB', '2026-12-20', '23:00:00', '2026-12-21', '01:49:00', 'T2', 'E13', 1859, 16191.99, 27, 30, 'Scheduled', 'Capt. Karthik Clark', 9),
    (20009, '6E203', 'IndiGo', 'Airbus A321neo', 'FRA', 'BLR', '2026-09-15', '06:30:00', '2026-09-15', '09:36:00', 'T2', 'B21', 2418, 40212.61, 30, 30, 'Arrived', 'Capt. Vikram Taylor', 8),
    (20010, '6E880', 'IndiGo', 'Embraer E190', 'MAA', 'BLR', '2026-10-14', '21:10:00', '2026-10-15', '06:01:00', 'T2', 'E12', 6903, 8991.64, 25, 30, 'Departed', 'Capt. Andrew Bose', 5);
INSERT INTO Flight (FlightID, FlightNumber, AirlineName, AircraftModel, SourceAirport, DestinationAirport, DepartureDate, DepartureTime, ArrivalDate, ArrivalTime, Terminal, Gate, DistanceKM, TicketPrice, AvailableSeats, TotalSeats, FlightStatus, PilotName, CabinCrewCount) VALUES
    (20011, 'AI252', 'Air India', 'Embraer E190', 'LKO', 'GOI', '2026-10-27', '14:05:00', '2026-10-28', '00:28:00', 'T2', 'A29', 8099, 49673.12, 29, 30, 'Scheduled', 'Capt. Ryan Reddy', 11),
    (20012, '6E459', 'IndiGo', 'Boeing 777-300ER', 'LHR', 'JFK', '2026-12-05', '03:00:00', '2026-12-05', '10:57:00', 'T2', 'A23', 5247, 29430.91, 28, 30, 'Cancelled', 'Capt. Daniel Desai', 6),
    (20013, '6E720', 'IndiGo', 'Airbus A321neo', 'CCU', 'BKK', '2026-12-11', '09:20:00', '2026-12-11', '17:45:00', 'T3', 'E17', 5050, 46020.43, 29, 30, 'Scheduled', 'Capt. Sai Patel', 9),
    (20014, 'QR418', 'Qatar Airways', 'Boeing 787-9 Dreamliner', 'BKK', 'HKG', '2026-09-30', '23:45:00', '2026-10-01', '09:41:00', 'T3', 'D19', 6556, 35614.81, 26, 30, 'Delayed', 'Capt. Henry Gupta', 10),
    (20015, 'QP552', 'Akasa Air', 'Boeing 777-300ER', 'PNQ', 'HKG', '2026-09-21', '11:40:00', '2026-09-21', '17:56:00', 'T3', 'E22', 4512, 22162.36, 29, 30, 'Scheduled', 'Capt. Suresh Joshi', 9),
    (20016, 'AI515', 'Air India', 'ATR 72-600', 'NRT', 'JAI', '2026-11-22', '13:45:00', '2026-11-22', '22:37:00', 'T3', 'D38', 7448, 26208.13, 26, 30, 'Departed', 'Capt. Andrew Saxena', 9),
    (20017, 'LH114', 'Lufthansa', 'Airbus A320neo', 'DXB', 'LKO', '2026-12-07', '11:30:00', '2026-12-07', '18:29:00', 'T3', 'A19', 5028, 51461.1, 28, 30, 'Scheduled', 'Capt. James Saxena', 12),
    (20018, 'BA888', 'British Airways', 'Boeing 777-300ER', 'BOM', 'MAA', '2026-10-13', '13:20:00', '2026-10-13', '20:53:00', 'T1', 'A15', 5436, 59681.06, 28, 30, 'Scheduled', 'Capt. Om Desai', 6),
    (20019, '6E652', 'IndiGo', 'Airbus A321neo', 'LKO', 'BKK', '2026-10-29', '03:50:00', '2026-10-29', '15:17:00', 'T2', 'B8', 9618, 34905.51, 27, 30, 'Scheduled', 'Capt. Ramesh Mehta', 5),
    (20020, 'AI995', 'Air India', 'Boeing 787-9 Dreamliner', 'BLR', 'HKG', '2026-12-04', '23:30:00', '2026-12-05', '01:07:00', 'T2', 'C36', 1067, 30218.28, 28, 30, 'Departed', 'Capt. Varun Verma', 11);
INSERT INTO Flight (FlightID, FlightNumber, AirlineName, AircraftModel, SourceAirport, DestinationAirport, DepartureDate, DepartureTime, ArrivalDate, ArrivalTime, Terminal, Gate, DistanceKM, TicketPrice, AvailableSeats, TotalSeats, FlightStatus, PilotName, CabinCrewCount) VALUES
    (20021, 'SG419', 'SpiceJet', 'ATR 72-600', 'BOM', 'SIN', '2026-09-20', '08:50:00', '2026-09-20', '18:59:00', 'T2', 'D10', 6699, 40529.51, 28, 30, 'Scheduled', 'Capt. Om Mehta', 4),
    (20022, 'QP540', 'Akasa Air', 'Boeing 787-9 Dreamliner', 'MAA', 'CCU', '2026-09-25', '08:55:00', '2026-09-25', '17:48:00', 'T1', 'A13', 7462, 41452.62, 28, 30, 'Scheduled', 'Capt. Lucas Bhatt', 11),
    (20023, 'QR500', 'Qatar Airways', 'Airbus A321neo', 'BLR', 'LKO', '2026-09-10', '00:25:00', '2026-09-10', '11:15:00', 'T2', 'E36', 6500, 19995.18, 29, 30, 'Scheduled', 'Capt. Benjamin Bose', 5),
    (20024, 'BA575', 'British Airways', 'Boeing 787-9 Dreamliner', 'BLR', 'GOI', '2026-11-11', '11:10:00', '2026-11-11', '15:04:00', 'T3', 'D24', 2574, 14878.28, 26, 30, 'Scheduled', 'Capt. Henry Allen', 7),
    (20025, 'SG585', 'SpiceJet', 'Airbus A350-900', 'HYD', 'LKO', '2026-09-09', '20:45:00', '2026-09-10', '00:03:00', 'T1', 'C31', 2772, 64546.62, 27, 30, 'Arrived', 'Capt. Siddharth Mehta', 4),
    (20026, 'QP565', 'Akasa Air', 'Airbus A350-900', 'CCU', 'AMD', '2026-10-21', '22:05:00', '2026-10-22', '02:37:00', 'T2', 'C9', 3264, 10484.56, 28, 30, 'Scheduled', 'Capt. Harsh Johnson', 4),
    (20027, 'AI192', 'Air India', 'Airbus A350-900', 'COK', 'SIN', '2026-12-22', '06:50:00', '2026-12-22', '11:17:00', 'T1', 'C32', 3738, 3504.79, 27, 30, 'Scheduled', 'Capt. Aditya Bose', 12),
    (20028, 'QR653', 'Qatar Airways', 'Embraer E190', 'NRT', 'JAI', '2026-12-05', '19:15:00', '2026-12-05', '20:58:00', 'T3', 'D4', 1236, 55169.97, 28, 30, 'Arrived', 'Capt. Aniket Davis', 9),
    (20029, 'EK360', 'Emirates', 'Airbus A320neo', 'PNQ', 'FRA', '2026-11-11', '20:40:00', '2026-11-12', '03:32:00', 'T2', 'D4', 5356, 36220.06, 27, 30, 'Delayed', 'Capt. Matthew Lewis', 4),
    (20030, 'SQ584', 'Singapore Airlines', 'Boeing 777-300ER', 'CCU', 'NRT', '2026-10-22', '03:55:00', '2026-10-22', '15:55:00', 'T3', 'B18', 8640, 62352.82, 27, 30, 'Scheduled', 'Capt. Henry Iyer', 7);

-- ---------------------------------------------------------------------------
-- 3.3 SEAT (900 rows -- 30 seats x 30 flights)
-- ---------------------------------------------------------------------------
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300001, 20001, '1A', 'First', 'Bulkhead', 3.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300002, 20001, '1B', 'First', 'Bulkhead', 3.0, 'Blocked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300003, 20001, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300004, 20001, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300005, 20001, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300006, 20001, '2B', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300007, 20001, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300008, 20001, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300009, 20001, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300010, 20001, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300011, 20001, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300012, 20001, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300013, 20001, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300014, 20001, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300015, 20001, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300016, 20001, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300017, 20001, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300018, 20001, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300019, 20001, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300020, 20001, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300021, 20001, '4E', 'Economy', 'Standard', 1.0, 'Under Maintenance', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300022, 20001, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300023, 20001, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300024, 20001, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300025, 20001, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300026, 20001, '5D', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300027, 20001, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300028, 20001, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300029, 20001, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300030, 20001, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300031, 20002, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300032, 20002, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300033, 20002, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300034, 20002, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300035, 20002, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300036, 20002, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300037, 20002, '2C', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300038, 20002, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300039, 20002, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300040, 20002, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300041, 20002, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300042, 20002, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300043, 20002, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300044, 20002, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300045, 20002, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300046, 20002, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300047, 20002, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300048, 20002, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300049, 20002, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300050, 20002, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300051, 20002, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300052, 20002, '4F', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300053, 20002, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300054, 20002, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300055, 20002, '5C', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300056, 20002, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300057, 20002, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300058, 20002, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300059, 20002, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300060, 20002, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300061, 20003, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300062, 20003, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300063, 20003, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300064, 20003, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300065, 20003, '2A', 'Business', 'Emergency Exit', 2.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300066, 20003, '2B', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300067, 20003, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300068, 20003, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300069, 20003, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300070, 20003, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300071, 20003, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300072, 20003, '3B', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300073, 20003, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300074, 20003, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300075, 20003, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300076, 20003, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300077, 20003, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300078, 20003, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300079, 20003, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300080, 20003, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300081, 20003, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300082, 20003, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300083, 20003, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300084, 20003, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300085, 20003, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300086, 20003, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300087, 20003, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300088, 20003, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300089, 20003, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300090, 20003, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300091, 20004, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300092, 20004, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300093, 20004, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300094, 20004, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300095, 20004, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300096, 20004, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300097, 20004, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300098, 20004, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300099, 20004, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300100, 20004, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300101, 20004, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300102, 20004, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300103, 20004, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300104, 20004, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300105, 20004, '3E', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300106, 20004, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300107, 20004, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300108, 20004, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300109, 20004, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300110, 20004, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300111, 20004, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300112, 20004, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300113, 20004, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300114, 20004, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300115, 20004, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300116, 20004, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300117, 20004, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300118, 20004, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300119, 20004, '6A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300120, 20004, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300121, 20005, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300122, 20005, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300123, 20005, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300124, 20005, '1D', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300125, 20005, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300126, 20005, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300127, 20005, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300128, 20005, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300129, 20005, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300130, 20005, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300131, 20005, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300132, 20005, '3B', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300133, 20005, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300134, 20005, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300135, 20005, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300136, 20005, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300137, 20005, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300138, 20005, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300139, 20005, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300140, 20005, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300141, 20005, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300142, 20005, '4F', 'Economy', 'Standard', 1.0, 'Under Maintenance', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300143, 20005, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300144, 20005, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300145, 20005, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300146, 20005, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300147, 20005, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300148, 20005, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300149, 20005, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300150, 20005, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300151, 20006, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300152, 20006, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300153, 20006, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300154, 20006, '1D', 'First', 'Bulkhead', 3.0, 'Blocked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300155, 20006, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300156, 20006, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300157, 20006, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300158, 20006, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300159, 20006, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300160, 20006, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300161, 20006, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300162, 20006, '3B', 'Premium Economy', 'Standard', 1.5, 'Under Maintenance', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300163, 20006, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300164, 20006, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300165, 20006, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300166, 20006, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300167, 20006, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300168, 20006, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300169, 20006, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300170, 20006, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300171, 20006, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300172, 20006, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300173, 20006, '5A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300174, 20006, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300175, 20006, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300176, 20006, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300177, 20006, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300178, 20006, '5F', 'Economy', 'Standard', 1.0, 'Blocked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300179, 20006, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300180, 20006, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300181, 20007, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300182, 20007, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300183, 20007, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300184, 20007, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300185, 20007, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300186, 20007, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300187, 20007, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300188, 20007, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300189, 20007, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300190, 20007, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300191, 20007, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300192, 20007, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300193, 20007, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300194, 20007, '3D', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300195, 20007, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300196, 20007, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300197, 20007, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300198, 20007, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300199, 20007, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300200, 20007, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300201, 20007, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300202, 20007, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300203, 20007, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300204, 20007, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300205, 20007, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300206, 20007, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300207, 20007, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300208, 20007, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300209, 20007, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300210, 20007, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300211, 20008, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300212, 20008, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300213, 20008, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300214, 20008, '1D', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300215, 20008, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300216, 20008, '2B', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300217, 20008, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300218, 20008, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300219, 20008, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300220, 20008, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300221, 20008, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300222, 20008, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300223, 20008, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300224, 20008, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300225, 20008, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300226, 20008, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300227, 20008, '4A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300228, 20008, '4B', 'Economy', 'Standard', 1.0, 'Blocked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300229, 20008, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300230, 20008, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300231, 20008, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300232, 20008, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300233, 20008, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300234, 20008, '5B', 'Economy', 'Standard', 1.0, 'Under Maintenance', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300235, 20008, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300236, 20008, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300237, 20008, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300238, 20008, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300239, 20008, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300240, 20008, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300241, 20009, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300242, 20009, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300243, 20009, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300244, 20009, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300245, 20009, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300246, 20009, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300247, 20009, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300248, 20009, '2D', 'Business', 'Extra Legroom', 2.0, 'Under Maintenance', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300249, 20009, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300250, 20009, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300251, 20009, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300252, 20009, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300253, 20009, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300254, 20009, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300255, 20009, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300256, 20009, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300257, 20009, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300258, 20009, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300259, 20009, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300260, 20009, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300261, 20009, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300262, 20009, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300263, 20009, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300264, 20009, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300265, 20009, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300266, 20009, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300267, 20009, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300268, 20009, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300269, 20009, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300270, 20009, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300271, 20010, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300272, 20010, '1B', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300273, 20010, '1C', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300274, 20010, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300275, 20010, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300276, 20010, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300277, 20010, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300278, 20010, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300279, 20010, '2E', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300280, 20010, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300281, 20010, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300282, 20010, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300283, 20010, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300284, 20010, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300285, 20010, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300286, 20010, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300287, 20010, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300288, 20010, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300289, 20010, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300290, 20010, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300291, 20010, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300292, 20010, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300293, 20010, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300294, 20010, '5B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300295, 20010, '5C', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300296, 20010, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300297, 20010, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300298, 20010, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300299, 20010, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300300, 20010, '6B', 'Economy', 'Standard', 1.0, 'Under Maintenance', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300301, 20011, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300302, 20011, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300303, 20011, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300304, 20011, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300305, 20011, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300306, 20011, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300307, 20011, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300308, 20011, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300309, 20011, '2E', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300310, 20011, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300311, 20011, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300312, 20011, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300313, 20011, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300314, 20011, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300315, 20011, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300316, 20011, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300317, 20011, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300318, 20011, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300319, 20011, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300320, 20011, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300321, 20011, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300322, 20011, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300323, 20011, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300324, 20011, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300325, 20011, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300326, 20011, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300327, 20011, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300328, 20011, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300329, 20011, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300330, 20011, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300331, 20012, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300332, 20012, '1B', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300333, 20012, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300334, 20012, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300335, 20012, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300336, 20012, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300337, 20012, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300338, 20012, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300339, 20012, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300340, 20012, '2F', 'Business', 'Extra Legroom', 2.0, 'Blocked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300341, 20012, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300342, 20012, '3B', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300343, 20012, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300344, 20012, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300345, 20012, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300346, 20012, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300347, 20012, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300348, 20012, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300349, 20012, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300350, 20012, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300351, 20012, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300352, 20012, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300353, 20012, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300354, 20012, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300355, 20012, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300356, 20012, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300357, 20012, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300358, 20012, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300359, 20012, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300360, 20012, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300361, 20013, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300362, 20013, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300363, 20013, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300364, 20013, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300365, 20013, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300366, 20013, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300367, 20013, '2C', 'Business', 'Extra Legroom', 2.0, 'Under Maintenance', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300368, 20013, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300369, 20013, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300370, 20013, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300371, 20013, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300372, 20013, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300373, 20013, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300374, 20013, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300375, 20013, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300376, 20013, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300377, 20013, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300378, 20013, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300379, 20013, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300380, 20013, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300381, 20013, '4E', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300382, 20013, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300383, 20013, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300384, 20013, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300385, 20013, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300386, 20013, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300387, 20013, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300388, 20013, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300389, 20013, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300390, 20013, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300391, 20014, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300392, 20014, '1B', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300393, 20014, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300394, 20014, '1D', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300395, 20014, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300396, 20014, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300397, 20014, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300398, 20014, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300399, 20014, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300400, 20014, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300401, 20014, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300402, 20014, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300403, 20014, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300404, 20014, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300405, 20014, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300406, 20014, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300407, 20014, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300408, 20014, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300409, 20014, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300410, 20014, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300411, 20014, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300412, 20014, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300413, 20014, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300414, 20014, '5B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300415, 20014, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300416, 20014, '5D', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300417, 20014, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300418, 20014, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300419, 20014, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300420, 20014, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300421, 20015, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300422, 20015, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300423, 20015, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300424, 20015, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300425, 20015, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300426, 20015, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300427, 20015, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300428, 20015, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300429, 20015, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300430, 20015, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300431, 20015, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300432, 20015, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300433, 20015, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300434, 20015, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300435, 20015, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300436, 20015, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300437, 20015, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300438, 20015, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300439, 20015, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300440, 20015, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300441, 20015, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300442, 20015, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300443, 20015, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300444, 20015, '5B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300445, 20015, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300446, 20015, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300447, 20015, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300448, 20015, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300449, 20015, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300450, 20015, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300451, 20016, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300452, 20016, '1B', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300453, 20016, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300454, 20016, '1D', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300455, 20016, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300456, 20016, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300457, 20016, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300458, 20016, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300459, 20016, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300460, 20016, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300461, 20016, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300462, 20016, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300463, 20016, '3C', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300464, 20016, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300465, 20016, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300466, 20016, '3F', 'Premium Economy', 'Standard', 1.5, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300467, 20016, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300468, 20016, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300469, 20016, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300470, 20016, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300471, 20016, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300472, 20016, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300473, 20016, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300474, 20016, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300475, 20016, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300476, 20016, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300477, 20016, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300478, 20016, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300479, 20016, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300480, 20016, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300481, 20017, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300482, 20017, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300483, 20017, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300484, 20017, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300485, 20017, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300486, 20017, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300487, 20017, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300488, 20017, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300489, 20017, '2E', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300490, 20017, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300491, 20017, '3A', 'Premium Economy', 'Standard', 1.5, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300492, 20017, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300493, 20017, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300494, 20017, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300495, 20017, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300496, 20017, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300497, 20017, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300498, 20017, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300499, 20017, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300500, 20017, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300501, 20017, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300502, 20017, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300503, 20017, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300504, 20017, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300505, 20017, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300506, 20017, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300507, 20017, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300508, 20017, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300509, 20017, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300510, 20017, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300511, 20018, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300512, 20018, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300513, 20018, '1C', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300514, 20018, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300515, 20018, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300516, 20018, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300517, 20018, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300518, 20018, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300519, 20018, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300520, 20018, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300521, 20018, '3A', 'Premium Economy', 'Standard', 1.5, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300522, 20018, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300523, 20018, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300524, 20018, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300525, 20018, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300526, 20018, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300527, 20018, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300528, 20018, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300529, 20018, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300530, 20018, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300531, 20018, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300532, 20018, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300533, 20018, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300534, 20018, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300535, 20018, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300536, 20018, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300537, 20018, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300538, 20018, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300539, 20018, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300540, 20018, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300541, 20019, '1A', 'First', 'Bulkhead', 3.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300542, 20019, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300543, 20019, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300544, 20019, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300545, 20019, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300546, 20019, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300547, 20019, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300548, 20019, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300549, 20019, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300550, 20019, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300551, 20019, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300552, 20019, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300553, 20019, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300554, 20019, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300555, 20019, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300556, 20019, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300557, 20019, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300558, 20019, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300559, 20019, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300560, 20019, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300561, 20019, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300562, 20019, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300563, 20019, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300564, 20019, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300565, 20019, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300566, 20019, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300567, 20019, '5E', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300568, 20019, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300569, 20019, '6A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300570, 20019, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300571, 20020, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300572, 20020, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300573, 20020, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300574, 20020, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300575, 20020, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300576, 20020, '2B', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300577, 20020, '2C', 'Business', 'Extra Legroom', 2.0, 'Under Maintenance', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300578, 20020, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300579, 20020, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300580, 20020, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300581, 20020, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300582, 20020, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300583, 20020, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300584, 20020, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300585, 20020, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300586, 20020, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300587, 20020, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300588, 20020, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300589, 20020, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300590, 20020, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300591, 20020, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300592, 20020, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300593, 20020, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300594, 20020, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300595, 20020, '5C', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300596, 20020, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300597, 20020, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300598, 20020, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300599, 20020, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300600, 20020, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300601, 20021, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300602, 20021, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300603, 20021, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300604, 20021, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300605, 20021, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300606, 20021, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300607, 20021, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300608, 20021, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300609, 20021, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300610, 20021, '2F', 'Business', 'Extra Legroom', 2.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300611, 20021, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300612, 20021, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300613, 20021, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300614, 20021, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300615, 20021, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300616, 20021, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300617, 20021, '4A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300618, 20021, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300619, 20021, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300620, 20021, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300621, 20021, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300622, 20021, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300623, 20021, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300624, 20021, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300625, 20021, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300626, 20021, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300627, 20021, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300628, 20021, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300629, 20021, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300630, 20021, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300631, 20022, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300632, 20022, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300633, 20022, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300634, 20022, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300635, 20022, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300636, 20022, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300637, 20022, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300638, 20022, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300639, 20022, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300640, 20022, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300641, 20022, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300642, 20022, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300643, 20022, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300644, 20022, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300645, 20022, '3E', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300646, 20022, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300647, 20022, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300648, 20022, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300649, 20022, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300650, 20022, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300651, 20022, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300652, 20022, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300653, 20022, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300654, 20022, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300655, 20022, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300656, 20022, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300657, 20022, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300658, 20022, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300659, 20022, '6A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300660, 20022, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300661, 20023, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300662, 20023, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300663, 20023, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300664, 20023, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300665, 20023, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300666, 20023, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300667, 20023, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300668, 20023, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300669, 20023, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300670, 20023, '2F', 'Business', 'Extra Legroom', 2.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300671, 20023, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300672, 20023, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300673, 20023, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300674, 20023, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300675, 20023, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300676, 20023, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300677, 20023, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300678, 20023, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300679, 20023, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300680, 20023, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300681, 20023, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300682, 20023, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300683, 20023, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300684, 20023, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300685, 20023, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300686, 20023, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300687, 20023, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300688, 20023, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300689, 20023, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300690, 20023, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300691, 20024, '1A', 'First', 'Bulkhead', 3.0, 'Booked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300692, 20024, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300693, 20024, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300694, 20024, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300695, 20024, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300696, 20024, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300697, 20024, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300698, 20024, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300699, 20024, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300700, 20024, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300701, 20024, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300702, 20024, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300703, 20024, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300704, 20024, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300705, 20024, '3E', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300706, 20024, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300707, 20024, '4A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300708, 20024, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300709, 20024, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300710, 20024, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300711, 20024, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300712, 20024, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300713, 20024, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300714, 20024, '5B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300715, 20024, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300716, 20024, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300717, 20024, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300718, 20024, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300719, 20024, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300720, 20024, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300721, 20025, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300722, 20025, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300723, 20025, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300724, 20025, '1D', 'First', 'Bulkhead', 3.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300725, 20025, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300726, 20025, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300727, 20025, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300728, 20025, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300729, 20025, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300730, 20025, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300731, 20025, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300732, 20025, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300733, 20025, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300734, 20025, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300735, 20025, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300736, 20025, '3F', 'Premium Economy', 'Standard', 1.5, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300737, 20025, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300738, 20025, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300739, 20025, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300740, 20025, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300741, 20025, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300742, 20025, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300743, 20025, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300744, 20025, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300745, 20025, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300746, 20025, '5D', 'Economy', 'Standard', 1.0, 'Under Maintenance', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300747, 20025, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300748, 20025, '5F', 'Economy', 'Standard', 1.0, 'Blocked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300749, 20025, '6A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300750, 20025, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300751, 20026, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300752, 20026, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300753, 20026, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300754, 20026, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300755, 20026, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300756, 20026, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300757, 20026, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300758, 20026, '2D', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300759, 20026, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300760, 20026, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300761, 20026, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300762, 20026, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300763, 20026, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300764, 20026, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300765, 20026, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300766, 20026, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300767, 20026, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300768, 20026, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300769, 20026, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300770, 20026, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300771, 20026, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300772, 20026, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300773, 20026, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300774, 20026, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300775, 20026, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300776, 20026, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300777, 20026, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300778, 20026, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300779, 20026, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300780, 20026, '6B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300781, 20027, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300782, 20027, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300783, 20027, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300784, 20027, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300785, 20027, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300786, 20027, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300787, 20027, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300788, 20027, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300789, 20027, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300790, 20027, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300791, 20027, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300792, 20027, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300793, 20027, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300794, 20027, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300795, 20027, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300796, 20027, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300797, 20027, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300798, 20027, '4B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300799, 20027, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300800, 20027, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300801, 20027, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300802, 20027, '4F', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300803, 20027, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300804, 20027, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300805, 20027, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300806, 20027, '5D', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300807, 20027, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300808, 20027, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300809, 20027, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300810, 20027, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300811, 20028, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300812, 20028, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300813, 20028, '1C', 'First', 'Bulkhead', 3.0, 'Blocked', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300814, 20028, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300815, 20028, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300816, 20028, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300817, 20028, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300818, 20028, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300819, 20028, '2E', 'Business', 'Extra Legroom', 2.0, 'Booked', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300820, 20028, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300821, 20028, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300822, 20028, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300823, 20028, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300824, 20028, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300825, 20028, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300826, 20028, '3F', 'Premium Economy', 'Standard', 1.5, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300827, 20028, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300828, 20028, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300829, 20028, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300830, 20028, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300831, 20028, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300832, 20028, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300833, 20028, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300834, 20028, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300835, 20028, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300836, 20028, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300837, 20028, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300838, 20028, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300839, 20028, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300840, 20028, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300841, 20029, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300842, 20029, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300843, 20029, '1C', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300844, 20029, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300845, 20029, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300846, 20029, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300847, 20029, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300848, 20029, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300849, 20029, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300850, 20029, '2F', 'Business', 'Extra Legroom', 2.0, 'Blocked', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300851, 20029, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300852, 20029, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300853, 20029, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300854, 20029, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300855, 20029, '3E', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300856, 20029, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300857, 20029, '4A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300858, 20029, '4B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300859, 20029, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300860, 20029, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300861, 20029, '4E', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300862, 20029, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300863, 20029, '5A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300864, 20029, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300865, 20029, '5C', 'Economy', 'Standard', 1.0, 'Booked', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300866, 20029, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300867, 20029, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300868, 20029, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300869, 20029, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300870, 20029, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300871, 20030, '1A', 'First', 'Bulkhead', 3.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300872, 20030, '1B', 'First', 'Bulkhead', 3.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300873, 20030, '1C', 'First', 'Bulkhead', 3.0, 'Under Maintenance', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300874, 20030, '1D', 'First', 'Bulkhead', 3.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300875, 20030, '2A', 'Business', 'Emergency Exit', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300876, 20030, '2B', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300877, 20030, '2C', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300878, 20030, '2D', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, TRUE, TRUE, TRUE, TRUE),
    (300879, 20030, '2E', 'Business', 'Extra Legroom', 2.0, 'Available', FALSE, FALSE, TRUE, TRUE, TRUE),
    (300880, 20030, '2F', 'Business', 'Extra Legroom', 2.0, 'Available', TRUE, FALSE, TRUE, TRUE, TRUE),
    (300881, 20030, '3A', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300882, 20030, '3B', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300883, 20030, '3C', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300884, 20030, '3D', 'Premium Economy', 'Standard', 1.5, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300885, 20030, '3E', 'Premium Economy', 'Standard', 1.5, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE);
INSERT INTO Seat (SeatID, FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort) VALUES
    (300886, 20030, '3F', 'Premium Economy', 'Standard', 1.5, 'Available', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300887, 20030, '4A', 'Economy', 'Standard', 1.0, 'Booked', TRUE, FALSE, FALSE, TRUE, TRUE),
    (300888, 20030, '4B', 'Economy', 'Standard', 1.0, 'Booked', FALSE, FALSE, FALSE, TRUE, TRUE),
    (300889, 20030, '4C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300890, 20030, '4D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300891, 20030, '4E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300892, 20030, '4F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300893, 20030, '5A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300894, 20030, '5B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300895, 20030, '5C', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, FALSE, TRUE),
    (300896, 20030, '5D', 'Economy', 'Standard', 1.0, 'Available', FALSE, TRUE, FALSE, TRUE, TRUE),
    (300897, 20030, '5E', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE),
    (300898, 20030, '5F', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300899, 20030, '6A', 'Economy', 'Standard', 1.0, 'Available', TRUE, FALSE, FALSE, FALSE, TRUE),
    (300900, 20030, '6B', 'Economy', 'Standard', 1.0, 'Available', FALSE, FALSE, FALSE, FALSE, TRUE);

-- ---------------------------------------------------------------------------
-- 3.4 BOOKING (100 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500001, 100020, 20014, 300414, 'PNRUSTB8J', '2026-07-26', '05:10:00', 'Confirmed', 'SAVE15', 5342.22, 3632.71, 33905.3, 'Airport Counter', FALSE, 'Agent-02'),
    (500002, 100002, 20028, 300826, 'PNR8X38EX', '2026-07-04', '09:10:00', 'Confirmed', NULL, 33101.98, 35750.14, 333668.0, 'Website', FALSE, 'Agent-01'),
    (500003, 100045, 20010, 300273, 'PNRN851KR', '2026-07-21', '14:10:00', 'Confirmed', NULL, 0.0, 6473.98, 60423.82, 'Website', FALSE, 'Agent-01'),
    (500004, 100043, 20003, 300072, 'PNRA8E1XF', '2026-06-24', '01:35:00', 'Confirmed', 'FLY10', 0.0, 8784.9, 81992.39, 'Travel Agent', FALSE, 'Agent-01'),
    (500005, 100037, 20014, 300392, 'PNRQNXK17', '2026-06-04', '14:50:00', 'Confirmed', NULL, 10684.44, 11539.2, 107699.19, 'Website', FALSE, 'System'),
    (500006, 100001, 20014, 300394, 'PNRCD06M6', '2026-07-07', '08:20:00', 'Confirmed', NULL, 0.0, 12821.33, 119665.76, 'Travel Agent', FALSE, 'Agent-02'),
    (500007, 100040, 20021, 300617, 'PNR41KWJC', '2026-07-09', '05:15:00', 'Confirmed', NULL, 0.0, 4863.54, 45393.05, 'Airport Counter', FALSE, 'OnlinePortal'),
    (500008, 100034, 20012, 300342, 'PNR47121G', '2026-07-05', '10:30:00', 'Confirmed', 'FESTIVE20', 4414.64, 4767.81, 44499.53, 'Airport Counter', FALSE, 'Agent-02'),
    (500009, 100040, 20003, 300076, 'PNR8CKZSR', '2026-07-27', '12:15:00', 'Cancelled', 'SAVE15', 14641.5, 15812.82, 147586.3, 'Airport Counter', FALSE, 'System'),
    (500010, 100018, 20008, 300214, 'PNRGV5NKP', '2026-06-15', '16:00:00', 'Confirmed', 'FLY10', 0.0, 11658.23, 108810.17, 'Airport Counter', FALSE, 'OnlinePortal');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500011, 100011, 20001, 300026, 'PNRY6RWZU', '2026-08-02', '12:40:00', 'Confirmed', NULL, 6217.01, 6714.37, 62667.44, 'Airport Counter', FALSE, 'System'),
    (500012, 100035, 20016, 300452, 'PNRUSMC6J', '2026-07-09', '16:35:00', 'Confirmed', NULL, 3931.22, 8963.18, 83656.35, 'Mobile App', FALSE, 'Agent-02'),
    (500013, 100023, 20023, 300670, 'PNRSCD7P6', '2026-06-23', '19:15:00', 'Confirmed', NULL, 7998.07, 8637.92, 80620.57, 'Mobile App', FALSE, 'OnlinePortal'),
    (500014, 100020, 20016, 300454, 'PNR9GHF1N', '2026-08-02', '15:05:00', 'Confirmed', 'FLY10', 11793.66, 8019.69, 74850.42, 'Travel Agent', TRUE, 'System'),
    (500015, 100014, 20029, 300865, 'PNR7DKWMS', '2026-07-08', '02:25:00', 'Confirmed', 'FLY10', 5433.01, 12387.26, 115614.43, 'Mobile App', FALSE, 'OnlinePortal'),
    (500016, 100016, 20011, 300318, 'PNRN7WCSC', '2026-07-17', '04:40:00', 'Cancelled', NULL, 4967.31, 11325.47, 105704.4, 'Travel Agent', FALSE, 'Agent-02'),
    (500017, 100034, 20028, 300819, 'PNRU7B1F0', '2026-07-03', '19:00:00', 'Confirmed', NULL, 11033.99, 11916.71, 111222.66, 'Mobile App', TRUE, 'Agent-02'),
    (500018, 100019, 20026, 300759, 'PNRSLMW6L', '2026-07-17', '19:50:00', 'Cancelled', 'FESTIVE20', 2096.91, 2264.67, 21136.88, 'Mobile App', FALSE, 'System'),
    (500019, 100047, 20002, 300041, 'PNR193U25', '2026-07-31', '12:05:00', 'Cancelled', 'SAVE15', 0.0, 7596.93, 70904.7, 'Mobile App', FALSE, 'OnlinePortal'),
    (500020, 100027, 20010, 300279, 'PNRX2KEKZ', '2026-08-02', '05:30:00', 'Confirmed', 'WELCOME5', 2697.49, 1834.29, 17120.08, 'Mobile App', TRUE, 'System');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500021, 100048, 20030, 300887, 'PNRM22T3V', '2026-06-04', '14:35:00', 'Confirmed', NULL, 0.0, 7482.34, 69835.16, 'Website', FALSE, 'OnlinePortal'),
    (500022, 100030, 20015, 300444, 'PNR0ZGKEP', '2026-07-24', '22:30:00', 'Confirmed', 'WELCOME5', 1108.12, 2526.51, 23580.75, 'Mobile App', FALSE, 'Agent-02'),
    (500023, 100020, 20027, 300806, 'PNRJD7ET4', '2026-06-28', '03:35:00', 'Confirmed', NULL, 0.0, 420.57, 3925.36, 'Travel Agent', TRUE, 'Agent-02'),
    (500024, 100023, 20025, 300736, 'PNRDG1SFM', '2026-07-12', '23:50:00', 'Confirmed', 'FLY10', 0.0, 11618.39, 108438.32, 'Travel Agent', FALSE, 'Agent-01'),
    (500025, 100038, 20003, 300074, 'PNRY1CKVD', '2026-08-05', '21:20:00', 'Cancelled', 'SAVE15', 0.0, 35139.6, 327969.56, 'Mobile App', FALSE, 'OnlinePortal'),
    (500026, 100036, 20001, 300016, 'PNRF2W88L', '2026-08-03', '08:20:00', 'Cancelled', NULL, 0.0, 11190.61, 104445.73, 'Mobile App', TRUE, 'OnlinePortal'),
    (500027, 100003, 20016, 300463, 'PNRJ1YS4D', '2026-06-22', '21:10:00', 'Confirmed', NULL, 23587.31, 16039.37, 149700.82, 'Travel Agent', FALSE, 'System'),
    (500028, 100011, 20005, 300125, 'PNR9MAJHM', '2026-07-27', '13:00:00', 'Cancelled', NULL, 0.0, 13594.25, 126879.69, 'Website', FALSE, 'Agent-01'),
    (500029, 100012, 20030, 300881, 'PNRKTNBMG', '2026-08-02', '20:55:00', 'Cancelled', 'FLY10', 0.0, 11223.51, 104752.74, 'Travel Agent', FALSE, 'OnlinePortal'),
    (500030, 100016, 20003, 300065, 'PNRSQ5804', '2026-06-23', '01:55:00', 'Confirmed', NULL, 0.0, 11713.2, 109323.18, 'Website', FALSE, 'System');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500031, 100042, 20027, 300781, 'PNRMMV2HF', '2026-06-17', '10:00:00', 'Cancelled', 'FESTIVE20', 1577.16, 1072.47, 10009.68, 'Website', TRUE, 'OnlinePortal'),
    (500032, 100011, 20002, 300037, 'PNR2MXTUX', '2026-07-31', '03:30:00', 'Confirmed', 'FESTIVE20', 50646.22, 34439.43, 321434.65, 'Mobile App', TRUE, 'Agent-01'),
    (500033, 100001, 20005, 300124, 'PNR8U362R', '2026-07-21', '03:45:00', 'Confirmed', NULL, 0.0, 40782.76, 380639.08, 'Website', FALSE, 'Agent-02'),
    (500034, 100008, 20028, 300825, 'PNRCGD2D7', '2026-07-21', '17:20:00', 'Cancelled', 'SAVE15', 0.0, 9930.6, 92685.56, 'Travel Agent', FALSE, 'Agent-02'),
    (500035, 100032, 20019, 300541, 'PNRA3SJ3Y', '2026-06-05', '09:00:00', 'Confirmed', 'WELCOME5', 0.0, 25131.97, 234565.03, 'Website', FALSE, 'System'),
    (500036, 100049, 20010, 300272, 'PNRRKNLSR', '2026-07-13', '07:15:00', 'Confirmed', NULL, 1348.75, 3075.14, 28701.31, 'Website', TRUE, 'System'),
    (500037, 100009, 20004, 300105, 'PNR6ERE04', '2026-07-07', '18:00:00', 'Confirmed', 'SAVE15', 0.0, 2361.16, 22037.51, 'Mobile App', FALSE, 'Agent-01'),
    (500038, 100014, 20025, 300724, 'PNRFK02X6', '2026-07-24', '21:50:00', 'Confirmed', 'SAVE15', 38727.97, 41826.21, 390377.96, 'Travel Agent', FALSE, 'OnlinePortal'),
    (500039, 100049, 20002, 300059, 'PNRUBHNVM', '2026-07-28', '10:00:00', 'Cancelled', NULL, 2110.26, 4811.39, 44906.31, 'Travel Agent', TRUE, 'System'),
    (500040, 100034, 20021, 300601, 'PNR08Q14J', '2026-07-19', '07:20:00', 'Cancelled', 'FLY10', 0.0, 29181.25, 272358.31, 'Mobile App', FALSE, 'Agent-02');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500041, 100004, 20024, 300705, 'PNRHYQYYN', '2026-08-06', '12:20:00', 'Confirmed', 'FLY10', 0.0, 2678.09, 24995.51, 'Airport Counter', FALSE, 'Agent-01'),
    (500042, 100039, 20024, 300714, 'PNRPZJSLS', '2026-06-06', '08:10:00', 'Confirmed', 'SAVE15', 0.0, 1785.39, 16663.67, 'Travel Agent', FALSE, 'Agent-02'),
    (500043, 100014, 20020, 300595, 'PNRDWDCV9', '2026-06-18', '14:35:00', 'Confirmed', NULL, 0.0, 10878.58, 101533.42, 'Airport Counter', FALSE, 'System'),
    (500044, 100050, 20011, 300309, 'PNRXF8N6U', '2026-07-12', '16:30:00', 'Confirmed', NULL, 0.0, 11921.55, 111267.79, 'Mobile App', FALSE, 'OnlinePortal'),
    (500045, 100016, 20019, 300567, 'PNRPUH1R6', '2026-06-07', '01:30:00', 'Confirmed', NULL, 1745.28, 3979.23, 37139.46, 'Travel Agent', FALSE, 'Agent-02'),
    (500046, 100018, 20023, 300665, 'PNRVBME0F', '2026-07-02', '00:50:00', 'Cancelled', NULL, 0.0, 4798.84, 44789.2, 'Website', FALSE, 'Agent-02'),
    (500047, 100018, 20017, 300509, 'PNRN00DL7', '2026-06-20', '10:20:00', 'Cancelled', NULL, 7719.16, 5249.03, 48990.97, 'Website', FALSE, 'OnlinePortal'),
    (500048, 100044, 20011, 300304, 'PNR4S5XX5', '2026-07-04', '16:30:00', 'Cancelled', NULL, 0.0, 35764.65, 333803.37, 'Airport Counter', FALSE, 'OnlinePortal'),
    (500049, 100006, 20019, 300552, 'PNRB0KM63', '2026-07-13', '17:20:00', 'Cancelled', 'FLY10', 23561.22, 16021.63, 149535.19, 'Website', FALSE, 'OnlinePortal'),
    (500050, 100042, 20002, 300055, 'PNR7D8J8T', '2026-06-11', '21:10:00', 'Confirmed', NULL, 0.0, 5064.62, 47269.8, 'Airport Counter', TRUE, 'System');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500051, 100043, 20026, 300758, 'PNRF9WTX3', '2026-07-24', '15:00:00', 'Confirmed', NULL, 1048.46, 2390.48, 22311.14, 'Mobile App', FALSE, 'System'),
    (500052, 100005, 20004, 300097, 'PNRSB7B0S', '2026-07-04', '20:35:00', 'Cancelled', 'FLY10', 7870.54, 8500.19, 79335.07, 'Airport Counter', FALSE, 'System'),
    (500053, 100035, 20020, 300576, 'PNR8LHF2R', '2026-08-01', '18:10:00', 'Confirmed', NULL, 3021.83, 6889.77, 64304.5, 'Website', TRUE, 'OnlinePortal'),
    (500054, 100007, 20017, 300489, 'PNR6863LT', '2026-07-25', '00:55:00', 'Confirmed', 'FESTIVE20', 15438.33, 10498.06, 97981.93, 'Mobile App', FALSE, 'Agent-01'),
    (500055, 100010, 20021, 300605, 'PNRVHZ2K2', '2026-07-14', '06:50:00', 'Cancelled', 'SAVE15', 12158.85, 8268.02, 77168.19, 'Mobile App', TRUE, 'Agent-01'),
    (500056, 100028, 20001, 300009, 'PNR1LHBGV', '2026-07-14', '10:50:00', 'Cancelled', NULL, 12434.02, 13428.74, 125334.88, 'Travel Agent', FALSE, 'Agent-01'),
    (500057, 100025, 20021, 300610, 'PNRJBTVQ2', '2026-08-01', '17:20:00', 'Confirmed', NULL, 0.0, 9727.08, 90786.1, 'Travel Agent', FALSE, 'OnlinePortal'),
    (500058, 100006, 20001, 300006, 'PNR6HC8MX', '2026-07-09', '10:55:00', 'Confirmed', 'WELCOME5', 12434.02, 13428.74, 125334.88, 'Airport Counter', TRUE, 'System'),
    (500059, 100025, 20001, 300001, 'PNRF79G1D', '2026-06-13', '04:15:00', 'Confirmed', 'FESTIVE20', 0.0, 22381.23, 208891.47, 'Website', TRUE, 'OnlinePortal'),
    (500060, 100004, 20025, 300749, 'PNRSP6C5F', '2026-08-03', '14:50:00', 'Confirmed', NULL, 25818.65, 27884.14, 260251.97, 'Website', FALSE, 'Agent-02');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500061, 100015, 20019, 300569, 'PNRMYCU7H', '2026-07-18', '09:20:00', 'Confirmed', 'FESTIVE20', 0.0, 4188.66, 39094.17, 'Mobile App', TRUE, 'Agent-01'),
    (500062, 100008, 20030, 300888, 'PNRAYH9FA', '2026-06-26', '01:55:00', 'Confirmed', 'FESTIVE20', 9352.92, 21324.66, 199030.2, 'Website', FALSE, 'OnlinePortal'),
    (500063, 100026, 20018, 300540, 'PNRFD72SS', '2026-06-13', '04:50:00', 'Cancelled', NULL, 8952.16, 6087.47, 56816.37, 'Airport Counter', FALSE, 'Agent-01'),
    (500064, 100021, 20008, 300216, 'PNR285ZXZ', '2026-07-11', '09:45:00', 'Confirmed', 'WELCOME5', 1619.2, 3691.77, 34456.55, 'Travel Agent', TRUE, 'Agent-01'),
    (500065, 100045, 20027, 300798, 'PNRCV898P', '2026-08-02', '21:35:00', 'Confirmed', NULL, 175.24, 399.55, 3729.1, 'Travel Agent', TRUE, 'OnlinePortal'),
    (500066, 100009, 20027, 300802, 'PNR7BWHFM', '2026-06-26', '17:25:00', 'Confirmed', NULL, 0.0, 420.57, 3925.36, 'Travel Agent', FALSE, 'Agent-01'),
    (500067, 100028, 20007, 300194, 'PNRFY55EF', '2026-06-05', '01:50:00', 'Confirmed', 'FLY10', 7429.05, 8023.38, 74884.86, 'Website', TRUE, 'OnlinePortal'),
    (500068, 100003, 20026, 300780, 'PNRYYEMUY', '2026-07-23', '16:55:00', 'Confirmed', 'WELCOME5', 0.0, 1258.15, 11742.71, 'Website', TRUE, 'OnlinePortal'),
    (500069, 100006, 20017, 300506, 'PNRGCB5H5', '2026-06-19', '09:45:00', 'Cancelled', NULL, 0.0, 12350.66, 115272.86, 'Airport Counter', FALSE, 'System'),
    (500070, 100042, 20018, 300521, 'PNRXKCF7T', '2026-07-09', '01:50:00', 'Confirmed', NULL, 0.0, 10742.59, 100264.18, 'Mobile App', TRUE, 'Agent-02');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500071, 100050, 20002, 300052, 'PNR2X6ZXK', '2026-06-12', '06:45:00', 'Confirmed', NULL, 0.0, 5064.62, 47269.8, 'Travel Agent', FALSE, 'Agent-02'),
    (500072, 100043, 20022, 300659, 'PNR2WJQ91', '2026-06-08', '23:40:00', 'Confirmed', NULL, 2072.63, 4725.6, 44105.59, 'Mobile App', FALSE, 'OnlinePortal'),
    (500073, 100032, 20012, 300343, 'PNR8C7WJ7', '2026-08-02', '14:55:00', 'Cancelled', NULL, 0.0, 5297.56, 49443.92, 'Airport Counter', FALSE, 'OnlinePortal'),
    (500074, 100031, 20017, 300491, 'PNR2FHRY3', '2026-07-18', '11:15:00', 'Confirmed', NULL, 0.0, 9263.0, 86454.65, 'Travel Agent', TRUE, 'System'),
    (500075, 100030, 20014, 300416, 'PNRETT55C', '2026-06-17', '11:00:00', 'Confirmed', 'SAVE15', 10684.44, 11539.2, 107699.19, 'Mobile App', FALSE, 'Agent-01'),
    (500076, 100047, 20018, 300513, 'PNR0VXCGW', '2026-06-27', '02:50:00', 'Confirmed', 'FESTIVE20', 0.0, 21485.18, 200528.36, 'Website', TRUE, 'Agent-02'),
    (500077, 100050, 20022, 300645, 'PNRFG6JMS', '2026-08-06', '14:20:00', 'Confirmed', NULL, 0.0, 7461.47, 69640.4, 'Airport Counter', FALSE, 'OnlinePortal'),
    (500078, 100024, 20016, 300466, 'PNRQTN0CN', '2026-07-27', '16:00:00', 'Confirmed', 'WELCOME5', 1965.61, 4481.59, 41828.17, 'Travel Agent', TRUE, 'System'),
    (500079, 100012, 20011, 300317, 'PNRE36GQ0', '2026-07-30', '08:25:00', 'Cancelled', 'WELCOME5', 0.0, 5960.77, 55633.89, 'Airport Counter', FALSE, 'Agent-01'),
    (500080, 100046, 20008, 300227, 'PNR8X5HJF', '2026-07-31', '04:00:00', 'Confirmed', NULL, 0.0, 1943.04, 18135.03, 'Airport Counter', FALSE, 'System');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500081, 100001, 20012, 300332, 'PNRQNZ7EA', '2026-08-04', '12:20:00', 'Confirmed', NULL, 0.0, 10595.13, 98887.86, 'Mobile App', FALSE, 'Agent-01'),
    (500082, 100027, 20015, 300434, 'PNRRN2ZVQ', '2026-08-03', '21:30:00', 'Cancelled', NULL, 0.0, 3989.22, 37232.76, 'Travel Agent', FALSE, 'OnlinePortal'),
    (500083, 100009, 20020, 300583, 'PNRE46SSS', '2026-06-17', '17:40:00', 'Cancelled', 'FLY10', 0.0, 5439.29, 50766.71, 'Mobile App', TRUE, 'Agent-01'),
    (500084, 100001, 20003, 300066, 'PNRTZUHJE', '2026-06-09', '19:30:00', 'Confirmed', 'FLY10', 0.0, 23426.4, 218646.36, 'Travel Agent', FALSE, 'Agent-02'),
    (500085, 100015, 20006, 300173, 'PNR00XTR2', '2026-07-29', '13:15:00', 'Confirmed', NULL, 2257.66, 5147.45, 48042.89, 'Website', FALSE, 'OnlinePortal'),
    (500086, 100022, 20023, 300685, 'PNRHYJ675', '2026-07-31', '02:00:00', 'Cancelled', 'SAVE15', 2999.28, 2039.51, 19035.41, 'Mobile App', TRUE, 'OnlinePortal'),
    (500087, 100037, 20029, 300861, 'PNR8E1TSL', '2026-08-06', '02:20:00', 'Confirmed', NULL, 3622.01, 3911.77, 36509.82, 'Travel Agent', TRUE, 'Agent-02'),
    (500088, 100047, 20024, 300691, 'PNR838VZS', '2026-06-15', '03:25:00', 'Confirmed', 'FLY10', 6695.23, 4552.75, 42492.36, 'Website', FALSE, 'Agent-01'),
    (500089, 100023, 20023, 300681, 'PNRAM99BG', '2026-06-25', '21:10:00', 'Cancelled', NULL, 0.0, 7198.26, 67183.8, 'Airport Counter', FALSE, 'OnlinePortal'),
    (500090, 100017, 20013, 300381, 'PNRLVV9X6', '2026-07-21', '19:05:00', 'Confirmed', 'SAVE15', 4602.04, 4970.21, 46388.6, 'Mobile App', FALSE, 'Agent-02');
INSERT INTO Booking (BookingID, PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime, BookingStatus, CouponCode, Discount, Tax, TotalFare, BookingChannel, TravelInsurance, CreatedBy) VALUES
    (500091, 100042, 20010, 300295, 'PNRBYEZXE', '2026-07-21', '22:20:00', 'Confirmed', 'WELCOME5', 449.58, 1025.05, 9567.11, 'Website', TRUE, 'Agent-01'),
    (500092, 100019, 20029, 300863, 'PNRHXTPN2', '2026-07-24', '03:35:00', 'Confirmed', 'WELCOME5', 0.0, 4346.41, 40566.47, 'Airport Counter', FALSE, 'Agent-02'),
    (500093, 100022, 20003, 300068, 'PNRU9LTCY', '2026-08-05', '10:30:00', 'Cancelled', NULL, 9761.0, 10541.88, 98390.86, 'Airport Counter', FALSE, 'System'),
    (500094, 100004, 20010, 300294, 'PNR93MK5Q', '2026-06-17', '22:25:00', 'Confirmed', 'FLY10', 0.0, 1079.0, 10070.64, 'Mobile App', TRUE, 'Agent-02'),
    (500095, 100008, 20030, 300885, 'PNRNQVT22', '2026-06-14', '06:40:00', 'Confirmed', NULL, 14029.38, 9539.98, 89039.83, 'Website', TRUE, 'Agent-02'),
    (500096, 100037, 20005, 300133, 'PNR1L3YL9', '2026-07-12', '10:20:00', 'Cancelled', 'FESTIVE20', 4248.2, 9685.91, 90401.79, 'Mobile App', TRUE, 'Agent-02'),
    (500097, 100004, 20004, 300119, 'PNRJFWMGD', '2026-07-04', '06:40:00', 'Confirmed', NULL, 655.88, 1495.4, 13957.09, 'Travel Agent', TRUE, 'OnlinePortal'),
    (500098, 100044, 20005, 300132, 'PNRHELYCH', '2026-07-13', '08:00:00', 'Confirmed', NULL, 0.0, 10195.69, 95159.77, 'Mobile App', FALSE, 'Agent-01'),
    (500099, 100045, 20024, 300707, 'PNR0X0ARP', '2026-07-16', '14:00:00', 'Confirmed', 'FESTIVE20', 0.0, 7141.57, 66654.69, 'Travel Agent', FALSE, 'OnlinePortal'),
    (500100, 100049, 20004, 300098, 'PNRVK9XSM', '2026-06-04', '12:05:00', 'Cancelled', 'FLY10', 2623.51, 2833.4, 26445.03, 'Website', FALSE, 'OnlinePortal');

-- ---------------------------------------------------------------------------
-- 3.5 PAYMENT (100 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700001, 500001, 'Credit Card', 33905.3, 253.06, 1695.27, 35853.63, 'TXN3EB710997A0C', 'Success', '2026-07-26', 'INV202600001'),
    (700002, 500002, 'Credit Card', 333668.0, 159.86, 16683.4, 350511.26, 'TXN441776C42367', 'Success', '2026-07-04', 'INV202600002'),
    (700003, 500003, 'Net Banking', 60423.82, 92.97, 3021.19, 63537.98, 'TXN226669F2D33C', 'Success', '2026-07-21', 'INV202600003'),
    (700004, 500004, 'UPI', 81992.39, 123.2, 4099.62, 86215.21, 'TXN77642D06B5F1', 'Success', '2026-06-24', 'INV202600004'),
    (700005, 500005, 'Wallet', 107699.19, 275.88, 5384.96, 113360.03, 'TXNF1C1C64A8DE8', 'Success', '2026-06-04', 'INV202600005'),
    (700006, 500006, 'Wallet', 119665.76, 286.87, 5983.29, 125935.92, 'TXNB3A21A59BD9D', 'Success', '2026-07-07', 'INV202600006'),
    (700007, 500007, 'Net Banking', 45393.05, 201.6, 2269.65, 47864.3, 'TXN9D18E444E854', 'Success', '2026-07-09', 'INV202600007'),
    (700008, 500008, 'Debit Card', 44499.53, 211.64, 2224.98, 46936.15, 'TXN0515C094669A', 'Success', '2026-07-05', 'INV202600008'),
    (700009, 500009, 'Net Banking', 147586.3, 156.51, 7379.31, 155122.12, 'TXN84CB161DAA0E', 'Success', '2026-07-27', 'INV202600009'),
    (700010, 500010, 'Wallet', 108810.17, 217.27, 5440.51, 114467.95, 'TXN2BB61DFE0845', 'Success', '2026-06-15', 'INV202600010');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700011, 500011, 'Net Banking', 62667.44, 261.21, 3133.37, 66062.02, 'TXN77DA556B5CA3', 'Pending', '2026-08-02', 'INV202600011'),
    (700012, 500012, 'UPI', 83656.35, 253.79, 4182.82, 88092.96, 'TXN03097D935550', 'Success', '2026-07-09', 'INV202600012'),
    (700013, 500013, 'UPI', 80620.57, 170.14, 4031.03, 84821.74, 'TXND4CF45153A76', 'Success', '2026-06-23', 'INV202600013'),
    (700014, 500014, 'Wallet', 74850.42, 134.2, 3742.52, 78727.14, 'TXN4D9622FE3143', 'Success', '2026-08-02', 'INV202600014'),
    (700015, 500015, 'Wallet', 115614.43, 228.42, 5780.72, 121623.57, 'TXN12B2CBA6E1AC', 'Success', '2026-07-08', 'INV202600015'),
    (700016, 500016, 'Debit Card', 105704.4, 241.48, 5285.22, 111231.1, 'TXN5FA30D01D555', 'Refunded', '2026-07-17', 'INV202600016'),
    (700017, 500017, 'Debit Card', 111222.66, 132.37, 5561.13, 116916.16, 'TXN3C5CB06E2C53', 'Success', '2026-07-03', 'INV202600017'),
    (700018, 500018, 'Net Banking', 21136.88, 51.79, 1056.84, 22245.51, 'TXN7C36AB7035D6', 'Success', '2026-07-17', 'INV202600018'),
    (700019, 500019, 'Net Banking', 70904.7, 255.07, 3545.24, 74705.01, 'TXN530B3898F736', 'Refunded', '2026-07-31', 'INV202600019'),
    (700020, 500020, 'Wallet', 17120.08, 219.22, 856.0, 18195.3, 'TXNF21F56B5F265', 'Success', '2026-08-02', 'INV202600020');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700021, 500021, 'Credit Card', 69835.16, 174.81, 3491.76, 73501.73, 'TXN0F619EF44778', 'Success', '2026-06-04', 'INV202600021'),
    (700022, 500022, 'Credit Card', 23580.75, 147.29, 1179.04, 24907.08, 'TXN471F7A334A3F', 'Success', '2026-07-24', 'INV202600022'),
    (700023, 500023, 'Net Banking', 3925.36, 234.59, 196.27, 4356.22, 'TXN9526808C4F3D', 'Success', '2026-06-28', 'INV202600023'),
    (700024, 500024, 'Net Banking', 108438.32, 148.03, 5421.92, 114008.27, 'TXNBD010D6F776A', 'Success', '2026-07-12', 'INV202600024'),
    (700025, 500025, 'Wallet', 327969.56, 187.79, 16398.48, 344555.83, 'TXN9FD4624B907F', 'Success', '2026-08-05', 'INV202600025'),
    (700026, 500026, 'Debit Card', 104445.73, 152.27, 5222.29, 109820.29, 'TXN063E55BE40C7', 'Success', '2026-08-03', 'INV202600026'),
    (700027, 500027, 'UPI', 149700.82, 273.24, 7485.04, 157459.1, 'TXNAC088754A2AA', 'Pending', '2026-06-22', 'INV202600027'),
    (700028, 500028, 'Debit Card', 126879.69, 115.41, 6343.98, 133339.08, 'TXNC689C6E1B62E', 'Refunded', '2026-07-27', 'INV202600028'),
    (700029, 500029, 'Net Banking', 104752.74, 282.09, 5237.64, 110272.47, 'TXN80180F29B054', 'Refunded', '2026-08-02', 'INV202600029'),
    (700030, 500030, 'Debit Card', 109323.18, 145.88, 5466.16, 114935.22, 'TXN4CD36D0122AB', 'Success', '2026-06-23', 'INV202600030');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700031, 500031, 'Debit Card', 10009.68, 145.72, 500.48, 10655.88, 'TXN562E5293A14F', 'Pending', '2026-06-17', 'INV202600031'),
    (700032, 500032, 'Net Banking', 321434.65, 129.32, 16071.73, 337635.7, 'TXN81F249F4FE3C', 'Success', '2026-07-31', 'INV202600032'),
    (700033, 500033, 'Credit Card', 380639.08, 273.51, 19031.95, 399944.54, 'TXN5FE1118B850B', 'Success', '2026-07-21', 'INV202600033'),
    (700034, 500034, 'Credit Card', 92685.56, 205.83, 4634.28, 97525.67, 'TXN783D93EDF3F4', 'Refunded', '2026-07-21', 'INV202600034'),
    (700035, 500035, 'Debit Card', 234565.03, 118.5, 11728.25, 246411.78, 'TXN5E5B119620A6', 'Success', '2026-06-05', 'INV202600035'),
    (700036, 500036, 'Credit Card', 28701.31, 266.22, 1435.07, 30402.6, 'TXN0D5370B0F1B7', 'Pending', '2026-07-13', 'INV202600036'),
    (700037, 500037, 'Net Banking', 22037.51, 148.52, 1101.88, 23287.91, 'TXN190BB6B0889A', 'Pending', '2026-07-07', 'INV202600037'),
    (700038, 500038, 'Credit Card', 390377.96, 296.19, 19518.9, 410193.05, 'TXN9632B77FB57C', 'Success', '2026-07-24', 'INV202600038'),
    (700039, 500039, 'Wallet', 44906.31, 75.05, 2245.32, 47226.68, 'TXN543194B134B7', 'Success', '2026-07-28', 'INV202600039'),
    (700040, 500040, 'Credit Card', 272358.31, 226.97, 13617.92, 286203.2, 'TXNBA7101CA17D0', 'Success', '2026-07-19', 'INV202600040');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700041, 500041, 'Debit Card', 24995.51, 284.59, 1249.78, 26529.88, 'TXN427C50AC46D0', 'Success', '2026-08-06', 'INV202600041'),
    (700042, 500042, 'Net Banking', 16663.67, 280.92, 833.18, 17777.77, 'TXN52CCA28E9989', 'Success', '2026-06-06', 'INV202600042'),
    (700043, 500043, 'Net Banking', 101533.42, 205.76, 5076.67, 106815.85, 'TXN4463D3CDD99A', 'Success', '2026-06-18', 'INV202600043'),
    (700044, 500044, 'UPI', 111267.79, 69.12, 5563.39, 116900.3, 'TXN1A286649507F', 'Success', '2026-07-12', 'INV202600044'),
    (700045, 500045, 'UPI', 37139.46, 294.84, 1856.97, 39291.27, 'TXN82D8A8106491', 'Success', '2026-06-07', 'INV202600045'),
    (700046, 500046, 'Credit Card', 44789.2, 242.12, 2239.46, 47270.78, 'TXN0744A80F1947', 'Success', '2026-07-02', 'INV202600046'),
    (700047, 500047, 'Debit Card', 48990.97, 53.66, 2449.55, 51494.18, 'TXNA45482020679', 'Success', '2026-06-20', 'INV202600047'),
    (700048, 500048, 'Net Banking', 333803.37, 206.15, 16690.17, 350699.69, 'TXNF4168D99B3F4', 'Refunded', '2026-07-04', 'INV202600048'),
    (700049, 500049, 'UPI', 149535.19, 205.61, 7476.76, 157217.56, 'TXN3412858D9E46', 'Success', '2026-07-13', 'INV202600049'),
    (700050, 500050, 'UPI', 47269.8, 86.58, 2363.49, 49719.87, 'TXN3D768410BD71', 'Success', '2026-06-11', 'INV202600050');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700051, 500051, 'Credit Card', 22311.14, 286.15, 1115.56, 23712.85, 'TXN5D501EB503C9', 'Success', '2026-07-24', 'INV202600051'),
    (700052, 500052, 'UPI', 79335.07, 162.81, 3966.75, 83464.63, 'TXN4A80E3AE0051', 'Success', '2026-07-04', 'INV202600052'),
    (700053, 500053, 'Credit Card', 64304.5, 106.33, 3215.23, 67626.06, 'TXNBDC4C1B95701', 'Success', '2026-08-01', 'INV202600053'),
    (700054, 500054, 'UPI', 97981.93, 51.9, 4899.1, 102932.93, 'TXN3E4E504B451F', 'Failed', '2026-07-25', 'INV202600054'),
    (700055, 500055, 'Debit Card', 77168.19, 196.86, 3858.41, 81223.46, 'TXN8E37C8012228', 'Refunded', '2026-07-14', 'INV202600055'),
    (700056, 500056, 'UPI', 125334.88, 94.76, 6266.74, 131696.38, 'TXN3A9C84F4CE13', 'Refunded', '2026-07-14', 'INV202600056'),
    (700057, 500057, 'Net Banking', 90786.1, 238.92, 4539.31, 95564.33, 'TXN528B33CCCE91', 'Success', '2026-08-01', 'INV202600057'),
    (700058, 500058, 'UPI', 125334.88, 299.14, 6266.74, 131900.76, 'TXN67308942B445', 'Success', '2026-07-09', 'INV202600058'),
    (700059, 500059, 'Wallet', 208891.47, 148.27, 10444.57, 219484.31, 'TXNF32FA33BC6DE', 'Success', '2026-06-13', 'INV202600059'),
    (700060, 500060, 'Debit Card', 260251.97, 80.4, 13012.6, 273344.97, 'TXN52546AA7C4E8', 'Success', '2026-08-03', 'INV202600060');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700061, 500061, 'Credit Card', 39094.17, 256.76, 1954.71, 41305.64, 'TXN9BB34E41C3DE', 'Success', '2026-07-18', 'INV202600061'),
    (700062, 500062, 'Wallet', 199030.2, 96.14, 9951.51, 209077.85, 'TXN645CCCBCCD34', 'Success', '2026-06-26', 'INV202600062'),
    (700063, 500063, 'Wallet', 56816.37, 55.95, 2840.82, 59713.14, 'TXN2122985E8895', 'Refunded', '2026-06-13', 'INV202600063'),
    (700064, 500064, 'Wallet', 34456.55, 198.05, 1722.83, 36377.43, 'TXN2CD38CC76A82', 'Success', '2026-07-11', 'INV202600064'),
    (700065, 500065, 'UPI', 3729.1, 299.39, 186.46, 4214.95, 'TXNDE3545D2CFED', 'Success', '2026-08-02', 'INV202600065'),
    (700066, 500066, 'Wallet', 3925.36, 170.0, 196.27, 4291.63, 'TXN846C2B949EEA', 'Pending', '2026-06-26', 'INV202600066'),
    (700067, 500067, 'Credit Card', 74884.86, 267.08, 3744.24, 78896.18, 'TXN80410C789792', 'Success', '2026-06-05', 'INV202600067'),
    (700068, 500068, 'Wallet', 11742.71, 188.58, 587.14, 12518.43, 'TXN18220B6B3485', 'Success', '2026-07-23', 'INV202600068'),
    (700069, 500069, 'Debit Card', 115272.86, 263.24, 5763.64, 121299.74, 'TXN38BD7DC3E557', 'Refunded', '2026-06-19', 'INV202600069'),
    (700070, 500070, 'UPI', 100264.18, 54.9, 5013.21, 105332.29, 'TXNC6E7A54577FC', 'Success', '2026-07-09', 'INV202600070');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700071, 500071, 'Debit Card', 47269.8, 125.87, 2363.49, 49759.16, 'TXNE1A4B6FAC014', 'Success', '2026-06-12', 'INV202600071'),
    (700072, 500072, 'Credit Card', 44105.59, 83.11, 2205.28, 46393.98, 'TXNFA9E4E702C53', 'Success', '2026-06-08', 'INV202600072'),
    (700073, 500073, 'Credit Card', 49443.92, 185.02, 2472.2, 52101.14, 'TXNF78ADE32B95A', 'Refunded', '2026-08-02', 'INV202600073'),
    (700074, 500074, 'UPI', 86454.65, 92.91, 4322.73, 90870.29, 'TXN2297A775D557', 'Success', '2026-07-18', 'INV202600074'),
    (700075, 500075, 'Wallet', 107699.19, 195.07, 5384.96, 113279.22, 'TXNF57675D5A015', 'Success', '2026-06-17', 'INV202600075'),
    (700076, 500076, 'Debit Card', 200528.36, 128.53, 10026.42, 210683.31, 'TXND185B60F6E3D', 'Success', '2026-06-27', 'INV202600076'),
    (700077, 500077, 'UPI', 69640.4, 117.8, 3482.02, 73240.22, 'TXN2285737329E1', 'Success', '2026-08-06', 'INV202600077'),
    (700078, 500078, 'Net Banking', 41828.17, 282.77, 2091.41, 44202.35, 'TXNF399EC25AFE1', 'Success', '2026-07-27', 'INV202600078'),
    (700079, 500079, 'Net Banking', 55633.89, 98.96, 2781.69, 58514.54, 'TXN0787609CA74F', 'Success', '2026-07-30', 'INV202600079'),
    (700080, 500080, 'Debit Card', 18135.03, 207.78, 906.75, 19249.56, 'TXND35703588E00', 'Success', '2026-07-31', 'INV202600080');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700081, 500081, 'Credit Card', 98887.86, 118.55, 4944.39, 103950.8, 'TXNCB52E186E403', 'Success', '2026-08-04', 'INV202600081'),
    (700082, 500082, 'Net Banking', 37232.76, 108.44, 1861.64, 39202.84, 'TXNDB115A2B2B45', 'Refunded', '2026-08-03', 'INV202600082'),
    (700083, 500083, 'Debit Card', 50766.71, 137.22, 2538.34, 53442.27, 'TXN4D7A1157D0BD', 'Refunded', '2026-06-17', 'INV202600083'),
    (700084, 500084, 'Wallet', 218646.36, 121.42, 10932.32, 229700.1, 'TXNCF8857ED9C0A', 'Pending', '2026-06-09', 'INV202600084'),
    (700085, 500085, 'Credit Card', 48042.89, 253.3, 2402.14, 50698.33, 'TXNAB8705255059', 'Success', '2026-07-29', 'INV202600085'),
    (700086, 500086, 'Credit Card', 19035.41, 281.13, 951.77, 20268.31, 'TXN11F6A7603400', 'Success', '2026-07-31', 'INV202600086'),
    (700087, 500087, 'Credit Card', 36509.82, 150.78, 1825.49, 38486.09, 'TXND6D653CE0A51', 'Pending', '2026-08-06', 'INV202600087'),
    (700088, 500088, 'UPI', 42492.36, 125.84, 2124.62, 44742.82, 'TXN570DF2AFBF4E', 'Success', '2026-06-15', 'INV202600088'),
    (700089, 500089, 'UPI', 67183.8, 272.87, 3359.19, 70815.86, 'TXNB759A7B13510', 'Refunded', '2026-06-25', 'INV202600089'),
    (700090, 500090, 'Credit Card', 46388.6, 241.04, 2319.43, 48949.07, 'TXN68B247010128', 'Success', '2026-07-21', 'INV202600090');
INSERT INTO Payment (PaymentID, BookingID, PaymentMethod, Amount, ConvenienceFee, GST, TotalAmount, TransactionID, PaymentStatus, PaymentDate, InvoiceNumber) VALUES
    (700091, 500091, 'Wallet', 9567.11, 230.84, 478.36, 10276.31, 'TXN329747EBA4E2', 'Success', '2026-07-21', 'INV202600091'),
    (700092, 500092, 'Credit Card', 40566.47, 204.54, 2028.32, 42799.33, 'TXN4C7B2CADB9AC', 'Failed', '2026-07-24', 'INV202600092'),
    (700093, 500093, 'Net Banking', 98390.86, 145.93, 4919.54, 103456.33, 'TXNE219AB96E3D5', 'Success', '2026-08-05', 'INV202600093'),
    (700094, 500094, 'Credit Card', 10070.64, 269.42, 503.53, 10843.59, 'TXNDEB510EC9811', 'Success', '2026-06-17', 'INV202600094'),
    (700095, 500095, 'Credit Card', 89039.83, 254.37, 4451.99, 93746.19, 'TXN01A451F65D34', 'Success', '2026-06-14', 'INV202600095'),
    (700096, 500096, 'Net Banking', 90401.79, 102.83, 4520.09, 95024.71, 'TXN8EB3EA0F54C3', 'Refunded', '2026-07-12', 'INV202600096'),
    (700097, 500097, 'Credit Card', 13957.09, 136.25, 697.85, 14791.19, 'TXNFD07ADBB1566', 'Success', '2026-07-04', 'INV202600097'),
    (700098, 500098, 'Wallet', 95159.77, 63.93, 4757.99, 99981.69, 'TXNE8AF2F95D22A', 'Success', '2026-07-13', 'INV202600098'),
    (700099, 500099, 'Debit Card', 66654.69, 71.91, 3332.73, 70059.33, 'TXNE1A750EA1106', 'Success', '2026-07-16', 'INV202600099'),
    (700100, 500100, 'Credit Card', 26445.03, 182.75, 1322.25, 27950.03, 'TXN0B4AD45D5618', 'Refunded', '2026-06-04', 'INV202600100');

-- ---------------------------------------------------------------------------
-- 3.6 CANCELLATION (30 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Cancellation (CancellationID, BookingID, CancellationDate, CancellationTime, Reason, RefundAmount, CancellationCharges, RefundStatus, CancellationStatus, ProcessedBy, RefundDate, Remarks, RefundMode, ApprovedBy) VALUES
    (900001, 500069, '2026-06-24', '21:15:00', 'Change of travel plans', 92218.29, 23054.57, 'Processed', 'Completed', 'Agent-03', '2026-06-29', NULL, 'Original Payment Method', 'Supervisor-B'),
    (900002, 500083, '2026-06-29', '01:55:00', 'Personal reasons', 40613.37, 10153.34, 'Processed', 'Completed', 'Agent-01', '2026-07-08', 'Customer notified', 'Bank Transfer', 'Supervisor-B'),
    (900003, 500063, '2026-06-15', '14:25:00', 'Personal reasons', 45453.1, 11363.27, 'Processed', 'Completed', 'System', '2026-06-25', NULL, 'Original Payment Method', 'Supervisor-B'),
    (900004, 500018, '2026-07-18', '03:55:00', 'Found a better fare', 17966.35, 3170.53, 'Pending', 'Rejected', 'Agent-01', NULL, 'Customer notified', 'Wallet', 'Supervisor-A'),
    (900005, 500019, '2026-08-03', '22:50:00', 'Flight rescheduled by airline', 60269.0, 10635.7, 'Processed', 'Completed', 'System', '2026-08-08', NULL, 'Bank Transfer', 'Supervisor-B'),
    (900006, 500096, '2026-07-24', '03:35:00', 'Change of travel plans', 76841.52, 13560.27, 'Processed', 'Completed', 'Agent-01', '2026-07-31', 'Customer notified', 'Bank Transfer', 'Supervisor-B'),
    (900007, 500052, '2026-07-14', '04:25:00', 'Visa rejected', 75368.32, 3966.75, 'Pending', 'Rejected', 'Agent-01', NULL, 'Handled as per policy', 'Wallet', NULL),
    (900008, 500046, '2026-07-10', '06:45:00', 'Flight rescheduled by airline', 42549.74, 2239.46, 'Pending', 'Approved', 'Agent-03', NULL, 'Awaiting review', 'Bank Transfer', 'Supervisor-A'),
    (900009, 500040, '2026-07-22', '05:10:00', 'Change of travel plans', 245122.48, 27235.83, 'Pending', 'Requested', 'Agent-02', NULL, NULL, 'Original Payment Method', 'Supervisor-B'),
    (900010, 500026, '2026-08-07', '16:55:00', 'Flight rescheduled by airline', 99223.44, 5222.29, 'Rejected', 'Approved', 'Agent-03', NULL, 'Customer notified', 'Wallet', NULL);
INSERT INTO Cancellation (CancellationID, BookingID, CancellationDate, CancellationTime, Reason, RefundAmount, CancellationCharges, RefundStatus, CancellationStatus, ProcessedBy, RefundDate, Remarks, RefundMode, ApprovedBy) VALUES
    (900011, 500086, '2026-08-07', '03:40:00', 'Personal reasons', 17131.87, 1903.54, 'Pending', 'Approved', 'Agent-03', NULL, NULL, 'Original Payment Method', NULL),
    (900012, 500034, '2026-07-22', '13:35:00', 'Visa rejected', 88051.28, 4634.28, 'Processed', 'Completed', 'Agent-02', '2026-07-25', 'Awaiting review', 'Original Payment Method', 'Supervisor-A'),
    (900013, 500082, '2026-08-07', '12:35:00', 'Duplicate booking', 35371.12, 1861.64, 'Processed', 'Completed', 'Agent-03', '2026-08-14', 'Handled as per policy', 'Original Payment Method', NULL),
    (900014, 500009, '2026-08-02', '00:20:00', 'Personal reasons', 140206.99, 7379.31, 'Pending', 'Requested', 'System', NULL, 'Handled as per policy', 'Bank Transfer', 'Supervisor-A'),
    (900015, 500031, '2026-06-22', '23:50:00', 'Found a better fare', 8508.23, 1501.45, 'Pending', 'Rejected', 'Agent-01', NULL, 'Customer notified', 'Original Payment Method', NULL),
    (900016, 500073, '2026-08-03', '01:10:00', 'Medical emergency', 39555.14, 9888.78, 'Processed', 'Completed', 'System', '2026-08-07', 'Awaiting review', 'Original Payment Method', 'Supervisor-B'),
    (900017, 500028, '2026-08-06', '22:05:00', 'Change of travel plans', 114191.72, 12687.97, 'Processed', 'Completed', 'Agent-02', '2026-08-13', NULL, 'Wallet', NULL),
    (900018, 500056, '2026-07-23', '16:35:00', 'Flight rescheduled by airline', 106534.65, 18800.23, 'Processed', 'Completed', 'Agent-01', '2026-08-01', NULL, 'Original Payment Method', 'Supervisor-A'),
    (900019, 500093, '2026-08-07', '18:00:00', 'Personal reasons', 93471.32, 4919.54, 'Pending', 'Approved', 'Agent-02', NULL, 'Handled as per policy', 'Original Payment Method', NULL),
    (900020, 500048, '2026-07-15', '09:00:00', 'Flight rescheduled by airline', 300423.03, 33380.34, 'Processed', 'Completed', 'Agent-02', '2026-07-20', NULL, 'Original Payment Method', 'Supervisor-A');
INSERT INTO Cancellation (CancellationID, BookingID, CancellationDate, CancellationTime, Reason, RefundAmount, CancellationCharges, RefundStatus, CancellationStatus, ProcessedBy, RefundDate, Remarks, RefundMode, ApprovedBy) VALUES
    (900021, 500055, '2026-07-28', '11:15:00', 'Duplicate booking', 69451.37, 7716.82, 'Processed', 'Completed', 'System', '2026-08-06', NULL, 'Original Payment Method', 'Supervisor-A'),
    (900022, 500079, '2026-08-07', '15:40:00', 'Visa rejected', 44507.11, 11126.78, 'Rejected', 'Approved', 'Agent-03', NULL, NULL, 'Wallet', NULL),
    (900023, 500039, '2026-08-03', '12:25:00', 'Medical emergency', 42660.99, 2245.32, 'Pending', 'Rejected', 'Agent-01', NULL, 'Customer notified', 'Wallet', 'Supervisor-B'),
    (900024, 500025, '2026-08-06', '16:55:00', 'Found a better fare', 311571.08, 16398.48, 'Rejected', 'Approved', 'System', NULL, 'Customer notified', 'Wallet', 'Supervisor-B'),
    (900025, 500049, '2026-07-26', '11:40:00', 'Medical emergency', 142058.43, 7476.76, 'Pending', 'Rejected', 'Agent-01', NULL, 'Customer notified', 'Bank Transfer', 'Supervisor-B'),
    (900026, 500047, '2026-06-30', '06:25:00', 'Change of travel plans', 44091.87, 4899.1, 'Rejected', 'Rejected', 'Agent-03', NULL, 'Handled as per policy', 'Original Payment Method', 'Supervisor-A'),
    (900027, 500100, '2026-06-16', '05:10:00', 'Visa rejected', 23800.53, 2644.5, 'Processed', 'Completed', 'System', '2026-06-18', 'Customer notified', 'Original Payment Method', 'Supervisor-B'),
    (900028, 500016, '2026-07-18', '13:05:00', 'Medical emergency', 84563.52, 21140.88, 'Processed', 'Completed', 'System', '2026-07-22', 'Handled as per policy', 'Wallet', 'Supervisor-A'),
    (900029, 500089, '2026-06-30', '11:10:00', 'Change of travel plans', 53747.04, 13436.76, 'Processed', 'Completed', 'Agent-01', '2026-07-05', NULL, 'Original Payment Method', 'Supervisor-A'),
    (900030, 500029, '2026-08-07', '22:05:00', 'Change of travel plans', 99515.1, 5237.64, 'Processed', 'Completed', 'Agent-02', '2026-08-11', 'Awaiting review', 'Bank Transfer', 'Supervisor-B');

-- ---------------------------------------------------------------------------
-- 3.7 REVIEW (50 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Review (ReviewID, PassengerID, FlightID, Rating, ReviewTitle, ReviewDescription, CabinCleanliness, FoodRating, StaffBehavior, Comfort, Entertainment, Recommend, ReviewDate, ReviewStatus) VALUES
    (400001, 100020, 20016, 4, 'Comfortable and on time', 'The flight experience was rated 4 out of 5. Cabin crew were attentive and professional.', 4, 4, 5, 3, 3, TRUE, '2026-06-17', 'Published'),
    (400002, 100019, 20029, 5, 'Not up to expectations', 'The flight experience was rated 5 out of 5. Cabin crew were attentive and professional.', 5, 5, 5, 5, 4, TRUE, '2026-06-06', 'Published'),
    (400003, 100003, 20016, 3, 'Excellent cabin crew', 'The flight experience was rated 3 out of 5. Would consider flying with this airline again.', 4, 3, 2, 3, 3, TRUE, '2026-07-01', 'Published'),
    (400004, 100014, 20025, 3, 'Smooth check-in and flight', 'The flight experience was rated 3 out of 5. Boarding process was smooth and well organized.', 4, 1, 3, 2, 3, TRUE, '2026-07-30', 'Published'),
    (400005, 100046, 20008, 3, 'Delayed but managed well', 'The flight experience was rated 3 out of 5. Would consider flying with this airline again.', 3, 4, 3, 3, 3, TRUE, '2026-06-05', 'Pending'),
    (400006, 100032, 20019, 3, 'Comfortable and on time', 'The flight experience was rated 3 out of 5. Seat comfort met expectations for the fare paid.', 3, 3, 3, 2, 1, TRUE, '2026-07-11', 'Published'),
    (400007, 100035, 20020, 4, 'Not up to expectations', 'The flight experience was rated 4 out of 5. Cabin crew were attentive and professional.', 3, 4, 4, 4, 4, TRUE, '2026-07-15', 'Published'),
    (400008, 100021, 20008, 4, 'Smooth check-in and flight', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 3, 3, 3, 3, 3, TRUE, '2026-07-27', 'Pending'),
    (400009, 100012, 20030, 5, 'Delayed but managed well', 'The flight experience was rated 5 out of 5. In-flight entertainment options were decent.', 4, 5, 5, 4, 3, TRUE, '2026-06-09', 'Published'),
    (400010, 100006, 20001, 5, 'Comfortable and on time', 'The flight experience was rated 5 out of 5. Seat comfort met expectations for the fare paid.', 5, 4, 5, 4, 5, TRUE, '2026-08-01', 'Flagged');
INSERT INTO Review (ReviewID, PassengerID, FlightID, Rating, ReviewTitle, ReviewDescription, CabinCleanliness, FoodRating, StaffBehavior, Comfort, Entertainment, Recommend, ReviewDate, ReviewStatus) VALUES
    (400011, 100018, 20017, 3, 'Would fly again', 'The flight experience was rated 3 out of 5. Seat comfort met expectations for the fare paid.', 3, 2, 4, 3, 1, TRUE, '2026-07-22', 'Published'),
    (400012, 100040, 20003, 2, 'Excellent cabin crew', 'The flight experience was rated 2 out of 5. Boarding process was smooth and well organized.', 1, 3, 3, 2, 1, FALSE, '2026-07-28', 'Pending'),
    (400013, 100025, 20001, 4, 'Excellent cabin crew', 'The flight experience was rated 4 out of 5. Cabin crew were attentive and professional.', 4, 4, 5, 3, 3, TRUE, '2026-07-29', 'Published'),
    (400014, 100011, 20005, 4, 'Food quality could improve', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 3, 4, 4, 5, 3, TRUE, '2026-08-01', 'Published'),
    (400015, 100024, 20016, 3, 'Not up to expectations', 'The flight experience was rated 3 out of 5. Cabin crew were attentive and professional.', 3, 2, 4, 4, 3, TRUE, '2026-07-24', 'Published'),
    (400016, 100011, 20001, 3, 'Not up to expectations', 'The flight experience was rated 3 out of 5. In-flight entertainment options were decent.', 4, 1, 4, 2, 3, TRUE, '2026-07-31', 'Published'),
    (400017, 100023, 20025, 3, 'Comfortable and on time', 'The flight experience was rated 3 out of 5. Would consider flying with this airline again.', 3, 3, 2, 4, 1, TRUE, '2026-08-02', 'Published'),
    (400018, 100006, 20019, 4, 'Average service', 'The flight experience was rated 4 out of 5. Seat comfort met expectations for the fare paid.', 4, 5, 4, 4, 4, TRUE, '2026-07-17', 'Published'),
    (400019, 100042, 20010, 5, 'Delayed but managed well', 'The flight experience was rated 5 out of 5. Would consider flying with this airline again.', 5, 5, 5, 4, 5, TRUE, '2026-07-06', 'Published'),
    (400020, 100008, 20030, 4, 'Great experience overall', 'The flight experience was rated 4 out of 5. Boarding process was smooth and well organized.', 4, 3, 4, 5, 4, TRUE, '2026-07-13', 'Published');
INSERT INTO Review (ReviewID, PassengerID, FlightID, Rating, ReviewTitle, ReviewDescription, CabinCleanliness, FoodRating, StaffBehavior, Comfort, Entertainment, Recommend, ReviewDate, ReviewStatus) VALUES
    (400021, 100001, 20012, 5, 'Comfortable and on time', 'The flight experience was rated 5 out of 5. In-flight entertainment options were decent.', 5, 4, 5, 5, 4, TRUE, '2026-06-19', 'Published'),
    (400022, 100049, 20004, 5, 'Comfortable and on time', 'The flight experience was rated 5 out of 5. Would consider flying with this airline again.', 5, 5, 5, 4, 4, TRUE, '2026-06-22', 'Published'),
    (400023, 100030, 20014, 5, 'Pleasant journey', 'The flight experience was rated 5 out of 5. In-flight entertainment options were decent.', 5, 5, 5, 4, 4, TRUE, '2026-06-04', 'Pending'),
    (400024, 100018, 20008, 3, 'Average service', 'The flight experience was rated 3 out of 5. Seat comfort met expectations for the fare paid.', 4, 2, 2, 3, 2, TRUE, '2026-07-12', 'Published'),
    (400025, 100009, 20020, 3, 'Comfortable and on time', 'The flight experience was rated 3 out of 5. In-flight entertainment options were decent.', 4, 4, 3, 3, 3, TRUE, '2026-06-28', 'Published'),
    (400026, 100028, 20007, 3, 'Not up to expectations', 'The flight experience was rated 3 out of 5. Cabin crew were attentive and professional.', 3, 2, 2, 4, 3, TRUE, '2026-07-04', 'Published'),
    (400027, 100042, 20002, 2, 'Comfortable and on time', 'The flight experience was rated 2 out of 5. Would consider flying with this airline again.', 3, 1, 1, 3, 2, FALSE, '2026-06-04', 'Published'),
    (400028, 100044, 20011, 5, 'Best flight of the year', 'The flight experience was rated 5 out of 5. In-flight entertainment options were decent.', 5, 4, 5, 4, 5, TRUE, '2026-07-15', 'Published'),
    (400029, 100001, 20005, 1, 'Comfortable and on time', 'The flight experience was rated 1 out of 5. Boarding process was smooth and well organized.', 1, 1, 1, 1, 1, FALSE, '2026-06-02', 'Published'),
    (400030, 100047, 20024, 5, 'Pleasant journey', 'The flight experience was rated 5 out of 5. Seat comfort met expectations for the fare paid.', 5, 5, 5, 5, 4, TRUE, '2026-06-30', 'Published');
INSERT INTO Review (ReviewID, PassengerID, FlightID, Rating, ReviewTitle, ReviewDescription, CabinCleanliness, FoodRating, StaffBehavior, Comfort, Entertainment, Recommend, ReviewDate, ReviewStatus) VALUES
    (400031, 100037, 20014, 2, 'Pleasant journey', 'The flight experience was rated 2 out of 5. Boarding process was smooth and well organized.', 2, 1, 1, 2, 2, FALSE, '2026-07-18', 'Published'),
    (400032, 100045, 20024, 3, 'Excellent cabin crew', 'The flight experience was rated 3 out of 5. Cabin crew were attentive and professional.', 3, 4, 3, 3, 3, TRUE, '2026-06-18', 'Published'),
    (400033, 100042, 20027, 4, 'Value for money', 'The flight experience was rated 4 out of 5. Would consider flying with this airline again.', 4, 4, 4, 5, 4, TRUE, '2026-07-08', 'Published'),
    (400034, 100045, 20010, 5, 'Pleasant journey', 'The flight experience was rated 5 out of 5. Cabin crew were attentive and professional.', 4, 5, 5, 4, 5, TRUE, '2026-06-20', 'Published'),
    (400035, 100035, 20016, 1, 'Value for money', 'The flight experience was rated 1 out of 5. In-flight entertainment options were decent.', 1, 2, 1, 1, 1, FALSE, '2026-06-11', 'Published'),
    (400036, 100015, 20019, 5, 'Great experience overall', 'The flight experience was rated 5 out of 5. Seat comfort met expectations for the fare paid.', 5, 3, 5, 5, 4, TRUE, '2026-07-03', 'Published'),
    (400037, 100009, 20027, 4, 'Value for money', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 5, 3, 4, 5, 3, TRUE, '2026-08-04', 'Published'),
    (400038, 100027, 20015, 4, 'Food quality could improve', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 3, 3, 4, 5, 2, TRUE, '2026-06-08', 'Published'),
    (400039, 100026, 20018, 3, 'Pleasant journey', 'The flight experience was rated 3 out of 5. In-flight entertainment options were decent.', 3, 4, 3, 2, 3, TRUE, '2026-07-06', 'Published'),
    (400040, 100043, 20003, 5, 'Great experience overall', 'The flight experience was rated 5 out of 5. Seat comfort met expectations for the fare paid.', 5, 3, 5, 5, 3, TRUE, '2026-06-01', 'Flagged');
INSERT INTO Review (ReviewID, PassengerID, FlightID, Rating, ReviewTitle, ReviewDescription, CabinCleanliness, FoodRating, StaffBehavior, Comfort, Entertainment, Recommend, ReviewDate, ReviewStatus) VALUES
    (400041, 100032, 20012, 4, 'Best flight of the year', 'The flight experience was rated 4 out of 5. Seat comfort met expectations for the fare paid.', 4, 5, 3, 4, 4, TRUE, '2026-07-15', 'Published'),
    (400042, 100006, 20017, 1, 'Smooth check-in and flight', 'The flight experience was rated 1 out of 5. Would consider flying with this airline again.', 2, 1, 2, 1, 1, FALSE, '2026-06-29', 'Published'),
    (400043, 100004, 20004, 4, 'Best flight of the year', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 3, 2, 3, 5, 2, TRUE, '2026-06-26', 'Published'),
    (400044, 100042, 20018, 5, 'Value for money', 'The flight experience was rated 5 out of 5. Would consider flying with this airline again.', 5, 4, 4, 5, 3, TRUE, '2026-06-14', 'Published'),
    (400045, 100050, 20011, 4, 'Not up to expectations', 'The flight experience was rated 4 out of 5. In-flight entertainment options were decent.', 4, 5, 5, 4, 3, TRUE, '2026-08-05', 'Published'),
    (400046, 100009, 20004, 5, 'Excellent cabin crew', 'The flight experience was rated 5 out of 5. In-flight entertainment options were decent.', 5, 4, 5, 5, 5, TRUE, '2026-07-08', 'Published'),
    (400047, 100047, 20018, 4, 'Average service', 'The flight experience was rated 4 out of 5. Boarding process was smooth and well organized.', 3, 3, 4, 3, 3, TRUE, '2026-06-22', 'Published'),
    (400048, 100027, 20010, 3, 'Great experience overall', 'The flight experience was rated 3 out of 5. Boarding process was smooth and well organized.', 2, 4, 2, 3, 2, TRUE, '2026-06-20', 'Published'),
    (400049, 100028, 20001, 5, 'Best flight of the year', 'The flight experience was rated 5 out of 5. Would consider flying with this airline again.', 5, 4, 5, 5, 3, TRUE, '2026-06-28', 'Published'),
    (400050, 100025, 20021, 5, 'Delayed but managed well', 'The flight experience was rated 5 out of 5. Boarding process was smooth and well organized.', 5, 4, 4, 5, 3, TRUE, '2026-08-01', 'Published');

-- ---------------------------------------------------------------------------
-- 3.8 BAGGAGE (100 rows)
-- ---------------------------------------------------------------------------
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800001, 500001, 11.31, 20.0, 0.0, 0.0, 3, 'Delivered', 'TAG0000148', '06:15:00', 'Collected', 'Fragile', 'Checked'),
    (800002, 500002, 19.08, 20.0, 0.0, 0.0, 3, 'Loaded', 'TAG0000212', '10:30:00', 'Collected', 'None', 'Checked'),
    (800003, 500003, 29.23, 20.0, 9.23, 4615.0, 1, 'Lost', 'TAG0000313', '04:40:00', 'Not Collected', 'Priority', 'Checked'),
    (800004, 500004, 23.17, 20.0, 3.17, 1585.0, 2, 'In Transit', 'TAG0000475', '18:45:00', 'Not Collected', 'Priority', 'Checked'),
    (800005, 500005, 21.45, 20.0, 1.45, 725.0, 2, 'Lost', 'TAG0000546', '16:45:00', 'Collected', 'None', 'Checked'),
    (800006, 500006, 10.01, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0000667', '14:10:00', 'Collected', 'None', 'Cabin'),
    (800007, 500007, 24.62, 20.0, 4.62, 2310.0, 1, 'In Transit', 'TAG0000717', '03:00:00', 'Collected', 'None', 'Checked'),
    (800008, 500008, 29.88, 20.0, 9.88, 4940.0, 2, 'Loaded', 'TAG0000894', '05:30:00', 'Collected', 'None', 'Checked'),
    (800009, 500009, 21.56, 20.0, 1.56, 780.0, 1, 'Delivered', 'TAG0000992', '09:25:00', 'Collected', 'None', 'Checked'),
    (800010, 500010, 26.32, 20.0, 6.32, 3160.0, 2, 'Lost', 'TAG0001051', '23:35:00', 'Not Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800011, 500011, 23.9, 20.0, 3.9, 1950.0, 2, 'Checked-In', 'TAG0001151', '02:40:00', 'Collected', 'None', 'Checked'),
    (800012, 500012, 26.63, 20.0, 6.63, 3315.0, 1, 'In Transit', 'TAG0001242', '14:05:00', 'Not Collected', 'None', 'Cabin'),
    (800013, 500013, 17.59, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0001321', '22:10:00', 'Collected', 'None', 'Checked'),
    (800014, 500014, 28.59, 20.0, 8.59, 4295.0, 3, 'Delivered', 'TAG0001457', '20:00:00', 'Not Collected', 'None', 'Checked'),
    (800015, 500015, 17.56, 20.0, 0.0, 0.0, 2, 'Loaded', 'TAG0001511', '08:30:00', 'Collected', 'None', 'Checked'),
    (800016, 500016, 26.7, 20.0, 6.7, 3350.0, 2, 'Delivered', 'TAG0001636', '17:45:00', 'Not Collected', 'None', 'Checked'),
    (800017, 500017, 24.22, 20.0, 4.22, 2110.0, 1, 'Loaded', 'TAG0001739', '12:20:00', 'Not Collected', 'Priority', 'Checked'),
    (800018, 500018, 19.58, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0001894', '02:50:00', 'Not Collected', 'None', 'Checked'),
    (800019, 500019, 23.53, 20.0, 3.53, 1765.0, 2, 'Checked-In', 'TAG0001985', '00:35:00', 'Not Collected', 'None', 'Checked'),
    (800020, 500020, 22.05, 20.0, 2.05, 1025.0, 1, 'Checked-In', 'TAG0002078', '08:15:00', 'Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800021, 500021, 31.89, 20.0, 11.89, 5945.0, 2, 'Delivered', 'TAG0002180', '05:45:00', 'Not Collected', 'None', 'Checked'),
    (800022, 500022, 12.78, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0002246', '05:15:00', 'Not Collected', 'None', 'Checked'),
    (800023, 500023, 16.35, 20.0, 0.0, 0.0, 2, 'Checked-In', 'TAG0002330', '05:25:00', 'Collected', 'None', 'Checked'),
    (800024, 500024, 27.97, 20.0, 7.97, 3985.0, 2, 'Delivered', 'TAG0002422', '23:15:00', 'Collected', 'None', 'Cabin'),
    (800025, 500025, 27.22, 20.0, 7.22, 3610.0, 1, 'Checked-In', 'TAG0002523', '21:20:00', 'Collected', 'Priority', 'Checked'),
    (800026, 500026, 26.33, 20.0, 6.33, 3165.0, 2, 'Checked-In', 'TAG0002623', '13:40:00', 'Not Collected', 'None', 'Checked'),
    (800027, 500027, 13.47, 20.0, 0.0, 0.0, 2, 'In Transit', 'TAG0002776', '22:05:00', 'Collected', 'None', 'Checked'),
    (800028, 500028, 23.98, 20.0, 3.98, 1990.0, 1, 'In Transit', 'TAG0002886', '06:25:00', 'Collected', 'None', 'Checked'),
    (800029, 500029, 26.42, 20.0, 6.42, 3210.0, 1, 'Delivered', 'TAG0002925', '03:55:00', 'Not Collected', 'None', 'Checked'),
    (800030, 500030, 23.95, 20.0, 3.95, 1975.0, 1, 'Lost', 'TAG0003065', '22:00:00', 'Not Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800031, 500031, 21.02, 20.0, 1.02, 510.0, 1, 'Delivered', 'TAG0003152', '07:50:00', 'Collected', 'None', 'Checked'),
    (800032, 500032, 30.98, 20.0, 10.98, 5490.0, 2, 'In Transit', 'TAG0003248', '07:50:00', 'Collected', 'None', 'Checked'),
    (800033, 500033, 30.5, 20.0, 10.5, 5250.0, 2, 'Checked-In', 'TAG0003340', '08:50:00', 'Collected', 'None', 'Checked'),
    (800034, 500034, 30.28, 20.0, 10.28, 5140.0, 1, 'Loaded', 'TAG0003454', '02:10:00', 'Collected', 'None', 'Checked'),
    (800035, 500035, 24.17, 20.0, 4.17, 2085.0, 1, 'Delivered', 'TAG0003561', '17:05:00', 'Not Collected', 'Fragile', 'Checked'),
    (800036, 500036, 10.01, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0003694', '12:50:00', 'Not Collected', 'None', 'Cabin'),
    (800037, 500037, 28.01, 20.0, 8.01, 4005.0, 1, 'In Transit', 'TAG0003754', '13:00:00', 'Collected', 'None', 'Checked'),
    (800038, 500038, 25.0, 20.0, 5.0, 2500.0, 1, 'Loaded', 'TAG0003891', '18:15:00', 'Not Collected', 'Fragile', 'Checked'),
    (800039, 500039, 20.87, 20.0, 0.87, 435.0, 1, 'Checked-In', 'TAG0003918', '02:50:00', 'Collected', 'None', 'Checked'),
    (800040, 500040, 13.52, 20.0, 0.0, 0.0, 1, 'Checked-In', 'TAG0004038', '21:50:00', 'Collected', 'Fragile', 'Cabin');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800041, 500041, 11.03, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0004158', '19:55:00', 'Collected', 'None', 'Cabin'),
    (800042, 500042, 16.8, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0004237', '13:05:00', 'Not Collected', 'None', 'Checked'),
    (800043, 500043, 28.55, 20.0, 8.55, 4275.0, 1, 'Checked-In', 'TAG0004341', '17:20:00', 'Collected', 'None', 'Checked'),
    (800044, 500044, 17.78, 20.0, 0.0, 0.0, 1, 'Loaded', 'TAG0004483', '20:10:00', 'Not Collected', 'None', 'Checked'),
    (800045, 500045, 13.71, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0004591', '16:30:00', 'Not Collected', 'None', 'Checked'),
    (800046, 500046, 13.6, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0004653', '03:35:00', 'Collected', 'Fragile', 'Cabin'),
    (800047, 500047, 26.22, 20.0, 6.22, 3110.0, 1, 'In Transit', 'TAG0004764', '13:20:00', 'Collected', 'Fragile', 'Cabin'),
    (800048, 500048, 29.37, 20.0, 9.37, 4685.0, 1, 'Delivered', 'TAG0004878', '01:10:00', 'Collected', 'None', 'Checked'),
    (800049, 500049, 23.27, 20.0, 3.27, 1635.0, 3, 'Checked-In', 'TAG0004936', '01:15:00', 'Not Collected', 'Priority', 'Checked'),
    (800050, 500050, 13.74, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0005019', '20:25:00', 'Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800051, 500051, 15.52, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0005157', '15:30:00', 'Collected', 'None', 'Cabin'),
    (800052, 500052, 21.88, 20.0, 1.88, 940.0, 2, 'In Transit', 'TAG0005256', '10:20:00', 'Collected', 'Priority', 'Checked'),
    (800053, 500053, 14.56, 20.0, 0.0, 0.0, 3, 'In Transit', 'TAG0005366', '21:55:00', 'Not Collected', 'None', 'Checked'),
    (800054, 500054, 13.23, 20.0, 0.0, 0.0, 3, 'Checked-In', 'TAG0005479', '03:50:00', 'Collected', 'None', 'Checked'),
    (800055, 500055, 13.15, 20.0, 0.0, 0.0, 1, 'Loaded', 'TAG0005522', '16:55:00', 'Not Collected', 'Priority', 'Checked'),
    (800056, 500056, 18.09, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0005623', '11:30:00', 'Not Collected', 'Fragile', 'Checked'),
    (800057, 500057, 31.43, 20.0, 11.43, 5715.0, 2, 'Lost', 'TAG0005746', '07:25:00', 'Collected', 'Fragile', 'Checked'),
    (800058, 500058, 23.81, 20.0, 3.81, 1905.0, 1, 'Loaded', 'TAG0005827', '02:45:00', 'Not Collected', 'Fragile', 'Checked'),
    (800059, 500059, 28.49, 20.0, 8.49, 4245.0, 1, 'Delivered', 'TAG0005960', '13:10:00', 'Not Collected', 'None', 'Cabin'),
    (800060, 500060, 27.62, 20.0, 7.62, 3810.0, 1, 'Delivered', 'TAG0006031', '14:55:00', 'Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800061, 500061, 27.66, 20.0, 7.66, 3830.0, 1, 'Loaded', 'TAG0006118', '11:20:00', 'Collected', 'None', 'Cabin'),
    (800062, 500062, 16.89, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0006213', '23:10:00', 'Collected', 'Priority', 'Checked'),
    (800063, 500063, 13.54, 20.0, 0.0, 0.0, 2, 'Checked-In', 'TAG0006397', '17:35:00', 'Not Collected', 'None', 'Checked'),
    (800064, 500064, 29.6, 20.0, 9.6, 4800.0, 1, 'Loaded', 'TAG0006482', '18:50:00', 'Not Collected', 'Fragile', 'Checked'),
    (800065, 500065, 15.5, 20.0, 0.0, 0.0, 2, 'Checked-In', 'TAG0006591', '12:05:00', 'Not Collected', 'Priority', 'Checked'),
    (800066, 500066, 29.06, 20.0, 9.06, 4530.0, 2, 'In Transit', 'TAG0006694', '18:55:00', 'Not Collected', 'Fragile', 'Checked'),
    (800067, 500067, 18.75, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0006723', '11:45:00', 'Collected', 'None', 'Cabin'),
    (800068, 500068, 11.28, 20.0, 0.0, 0.0, 2, 'Checked-In', 'TAG0006867', '14:10:00', 'Not Collected', 'None', 'Checked'),
    (800069, 500069, 12.19, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0006942', '01:55:00', 'Not Collected', 'None', 'Cabin'),
    (800070, 500070, 11.06, 20.0, 0.0, 0.0, 2, 'In Transit', 'TAG0007017', '00:10:00', 'Collected', 'None', 'Cabin');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800071, 500071, 24.86, 20.0, 4.86, 2430.0, 1, 'Delivered', 'TAG0007194', '05:55:00', 'Not Collected', 'None', 'Checked'),
    (800072, 500072, 21.67, 20.0, 1.67, 835.0, 1, 'Delivered', 'TAG0007293', '21:15:00', 'Not Collected', 'Priority', 'Checked'),
    (800073, 500073, 28.1, 20.0, 8.1, 4050.0, 2, 'Loaded', 'TAG0007385', '16:25:00', 'Not Collected', 'None', 'Checked'),
    (800074, 500074, 27.52, 20.0, 7.52, 3760.0, 3, 'Checked-In', 'TAG0007427', '13:40:00', 'Not Collected', 'None', 'Checked'),
    (800075, 500075, 15.63, 20.0, 0.0, 0.0, 1, 'Checked-In', 'TAG0007550', '10:25:00', 'Not Collected', 'None', 'Checked'),
    (800076, 500076, 21.87, 20.0, 1.87, 935.0, 1, 'Delivered', 'TAG0007647', '10:25:00', 'Collected', 'Priority', 'Checked'),
    (800077, 500077, 17.5, 20.0, 0.0, 0.0, 2, 'Lost', 'TAG0007761', '11:35:00', 'Collected', 'None', 'Cabin'),
    (800078, 500078, 11.41, 20.0, 0.0, 0.0, 1, 'Loaded', 'TAG0007882', '05:20:00', 'Collected', 'None', 'Checked'),
    (800079, 500079, 16.49, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0007984', '07:30:00', 'Collected', 'None', 'Checked'),
    (800080, 500080, 14.52, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0008011', '22:35:00', 'Collected', 'None', 'Checked');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800081, 500081, 10.32, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0008144', '22:55:00', 'Not Collected', 'Priority', 'Checked'),
    (800082, 500082, 20.44, 20.0, 0.44, 220.0, 1, 'Delivered', 'TAG0008275', '08:45:00', 'Collected', 'None', 'Checked'),
    (800083, 500083, 11.48, 20.0, 0.0, 0.0, 1, 'Delivered', 'TAG0008393', '08:50:00', 'Collected', 'Priority', 'Checked'),
    (800084, 500084, 28.52, 20.0, 8.52, 4260.0, 1, 'Loaded', 'TAG0008477', '09:25:00', 'Not Collected', 'None', 'Checked'),
    (800085, 500085, 27.36, 20.0, 7.36, 3680.0, 1, 'Delivered', 'TAG0008585', '11:20:00', 'Collected', 'None', 'Checked'),
    (800086, 500086, 30.33, 20.0, 10.33, 5165.0, 3, 'Checked-In', 'TAG0008698', '19:10:00', 'Collected', 'None', 'Checked'),
    (800087, 500087, 22.96, 20.0, 2.96, 1480.0, 1, 'Loaded', 'TAG0008782', '06:40:00', 'Collected', 'None', 'Cabin'),
    (800088, 500088, 10.08, 20.0, 0.0, 0.0, 1, 'Checked-In', 'TAG0008893', '18:15:00', 'Collected', 'None', 'Checked'),
    (800089, 500089, 24.46, 20.0, 4.46, 2230.0, 2, 'Checked-In', 'TAG0008941', '03:10:00', 'Not Collected', 'None', 'Checked'),
    (800090, 500090, 25.37, 20.0, 5.37, 2685.0, 1, 'Checked-In', 'TAG0009037', '14:05:00', 'Not Collected', 'None', 'Cabin');
INSERT INTO Baggage (BaggageID, BookingID, BagWeight, AllowedWeight, ExtraWeight, ExtraCharge, NumberOfBags, BaggageStatus, TagNumber, CheckInTime, CollectionStatus, SpecialHandling, BaggageType) VALUES
    (800091, 500091, 27.8, 20.0, 7.8, 3900.0, 1, 'Delivered', 'TAG0009174', '03:50:00', 'Not Collected', 'None', 'Checked'),
    (800092, 500092, 20.39, 20.0, 0.39, 195.0, 1, 'Checked-In', 'TAG0009282', '22:50:00', 'Collected', 'None', 'Checked'),
    (800093, 500093, 12.63, 20.0, 0.0, 0.0, 1, 'In Transit', 'TAG0009319', '23:15:00', 'Not Collected', 'None', 'Checked'),
    (800094, 500094, 10.92, 20.0, 0.0, 0.0, 2, 'Loaded', 'TAG0009450', '01:10:00', 'Collected', 'Priority', 'Checked'),
    (800095, 500095, 21.43, 20.0, 1.43, 715.0, 2, 'Delivered', 'TAG0009529', '21:40:00', 'Collected', 'Priority', 'Checked'),
    (800096, 500096, 28.52, 20.0, 8.52, 4260.0, 2, 'Checked-In', 'TAG0009656', '20:35:00', 'Not Collected', 'Fragile', 'Checked'),
    (800097, 500097, 10.78, 20.0, 0.0, 0.0, 2, 'Checked-In', 'TAG0009743', '03:50:00', 'Collected', 'None', 'Checked'),
    (800098, 500098, 12.0, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0009894', '06:45:00', 'Not Collected', 'Fragile', 'Checked'),
    (800099, 500099, 11.24, 20.0, 0.0, 0.0, 2, 'Delivered', 'TAG0009917', '13:20:00', 'Not Collected', 'None', 'Checked'),
    (800100, 500100, 16.27, 20.0, 0.0, 0.0, 2, 'In Transit', 'TAG0010068', '23:55:00', 'Collected', 'None', 'Checked');

SET FOREIGN_KEY_CHECKS = 1;

-- MySQL Workbench enables 'Safe Updates' by default, which blocks UPDATE/DELETE
-- statements that have no key in the WHERE clause. Disable it for this session.
SET SQL_SAFE_UPDATES = 0;

-- =====================================================================================
-- SECTION 4: ADDITIONAL INDEXES (BEYOND THOSE CREATED WITH THE TABLES)
-- =====================================================================================

ALTER TABLE Booking   ADD INDEX idx_booking_channel (BookingChannel);
ALTER TABLE Payment   ADD INDEX idx_payment_txn_prefix (TransactionID);
ALTER TABLE Passenger ADD INDEX idx_passenger_nationality (Nationality);

-- =====================================================================================
-- SECTION 5: VIEWS
-- =====================================================================================

-- View 1: Full booking summary joining passenger, flight, seat and payment info
CREATE OR REPLACE VIEW vw_BookingDetails AS
SELECT
    b.BookingID,
    b.BookingReference,
    CONCAT(p.FirstName, ' ', p.LastName)      AS PassengerName,
    p.Email,
    f.FlightNumber,
    f.AirlineName,
    f.SourceAirport,
    f.DestinationAirport,
    f.DepartureDate,
    s.SeatNumber,
    s.SeatClass,
    b.NumberOfPassengers,
    b.BookingStatus,
    b.TotalFare,
    pay.PaymentStatus,
    pay.TotalAmount AS AmountPaid
FROM Booking b
JOIN Passenger p ON p.PassengerID = b.PassengerID
JOIN Flight f     ON f.FlightID    = b.FlightID
JOIN Seat s       ON s.SeatID      = b.SeatID
LEFT JOIN Payment pay ON pay.BookingID = b.BookingID;

-- View 2: Flight occupancy and revenue snapshot
CREATE OR REPLACE VIEW vw_FlightOccupancy AS
SELECT
    f.FlightID,
    f.FlightNumber,
    f.AirlineName,
    f.SourceAirport,
    f.DestinationAirport,
    f.DepartureDate,
    f.TotalSeats,
    f.AvailableSeats,
    (f.TotalSeats - f.AvailableSeats)                                   AS SeatsBooked,
    ROUND((f.TotalSeats - f.AvailableSeats) / f.TotalSeats * 100, 2)    AS OccupancyPercent,
    ROUND(SUM(CASE WHEN bo.BookingStatus <> 'Cancelled' THEN bo.TotalFare ELSE 0 END), 2) AS EstimatedRevenue
FROM Flight f
LEFT JOIN Booking bo ON bo.FlightID = f.FlightID
GROUP BY f.FlightID, f.FlightNumber, f.AirlineName, f.SourceAirport,
         f.DestinationAirport, f.DepartureDate, f.TotalSeats, f.AvailableSeats;

-- View 3: Passenger lifetime spending and booking counts
CREATE OR REPLACE VIEW vw_PassengerSpending AS
SELECT
    p.PassengerID,
    CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName,
    p.FrequentFlyerMembership,
    COUNT(b.BookingID)                                                      AS TotalBookings,
    SUM(CASE WHEN b.BookingStatus = 'Cancelled' THEN 1 ELSE 0 END)          AS CancelledBookings,
    ROUND(SUM(CASE WHEN b.BookingStatus <> 'Cancelled' THEN b.TotalFare ELSE 0 END), 2) AS TotalSpend
FROM Passenger p
LEFT JOIN Booking b ON b.PassengerID = p.PassengerID
GROUP BY p.PassengerID, p.FirstName, p.LastName, p.FrequentFlyerMembership;

-- View 4: Average review scores per flight
CREATE OR REPLACE VIEW vw_TopRatedFlights AS
SELECT
    f.FlightID,
    f.FlightNumber,
    f.AirlineName,
    COUNT(r.ReviewID)              AS ReviewCount,
    ROUND(AVG(r.Rating), 2)        AS AvgRating,
    ROUND(AVG(r.Comfort), 2)       AS AvgComfort,
    ROUND(AVG(r.StaffBehavior), 2) AS AvgStaffBehavior
FROM Flight f
JOIN Review r ON r.FlightID = f.FlightID
GROUP BY f.FlightID, f.FlightNumber, f.AirlineName;

-- =====================================================================================
-- SECTION 6: FUNCTIONS
-- =====================================================================================

DELIMITER $$

CREATE FUNCTION fn_CalculateAge(p_DOB DATE)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_DOB, CURDATE());
END$$

CREATE FUNCTION fn_GetPassengerFullName(p_PassengerID INT)
RETURNS VARCHAR(150)
READS SQL DATA
BEGIN
    DECLARE v_name VARCHAR(150);
    SELECT CONCAT(FirstName, ' ', IFNULL(CONCAT(MiddleName, ' '), ''), LastName)
      INTO v_name
      FROM Passenger
     WHERE PassengerID = p_PassengerID;
    RETURN v_name;
END$$

CREATE FUNCTION fn_LoyaltyTier(p_FlightsTaken INT)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_tier VARCHAR(20);
    IF p_FlightsTaken >= 30 THEN
        SET v_tier = 'Platinum';
    ELSEIF p_FlightsTaken >= 15 THEN
        SET v_tier = 'Gold';
    ELSEIF p_FlightsTaken >= 5 THEN
        SET v_tier = 'Silver';
    ELSE
        SET v_tier = 'None';
    END IF;
    RETURN v_tier;
END$$

CREATE FUNCTION fn_FlightOccupancyPercent(p_FlightID INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
    DECLARE v_total INT;
    DECLARE v_avail INT;
    DECLARE v_pct DECIMAL(5,2);
    SELECT TotalSeats, AvailableSeats INTO v_total, v_avail
      FROM Flight WHERE FlightID = p_FlightID;
    IF v_total IS NULL OR v_total = 0 THEN
        RETURN 0.00;
    END IF;
    SET v_pct = ROUND((v_total - v_avail) / v_total * 100, 2);
    RETURN v_pct;
END$$

DELIMITER ;

-- =====================================================================================
-- SECTION 7: STORED PROCEDURES
-- =====================================================================================

DELIMITER $$

-- Procedure 1: Retrieve full booking history for a passenger
CREATE PROCEDURE sp_GetPassengerBookingHistory(IN p_PassengerID INT)
BEGIN
    SELECT
        b.BookingID, b.BookingReference, f.FlightNumber, f.AirlineName,
        f.SourceAirport, f.DestinationAirport, f.DepartureDate AS JourneyDate,
        s.SeatNumber, s.SeatClass, b.BookingStatus, b.TotalFare
    FROM Booking b
    JOIN Flight f ON f.FlightID = b.FlightID
    JOIN Seat s   ON s.SeatID   = b.SeatID
    WHERE b.PassengerID = p_PassengerID
    ORDER BY f.DepartureDate DESC;
END$$

-- Procedure 2: Book a seat end-to-end using a transaction, a savepoint and
-- row locking to avoid double-booking; rolls back cleanly if the seat is unavailable.
CREATE PROCEDURE sp_BookSeat(
    IN  p_PassengerID INT,
    IN  p_FlightID    INT,
    IN  p_SeatID      INT,
    IN  p_NumPax      INT,
    IN  p_Channel     VARCHAR(20),
    OUT p_BookingRef  VARCHAR(10)
)
BEGIN
    DECLARE v_status   VARCHAR(20);
    DECLARE v_mult     DECIMAL(4,2);
    DECLARE v_ticket   DECIMAL(10,2);
    DECLARE v_fare     DECIMAL(10,2);
    DECLARE v_tax      DECIMAL(10,2);
    DECLARE v_ref      VARCHAR(10);
    DECLARE v_seat_flight INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT SeatStatus, SeatPriceMultiplier, FlightID
      INTO v_status, v_mult, v_seat_flight
      FROM Seat
     WHERE SeatID = p_SeatID
       FOR UPDATE;

    IF v_seat_flight <> p_FlightID THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seat does not belong to the specified flight';
    ELSEIF v_status <> 'Available' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected seat is not available';
    ELSE
        SAVEPOINT before_booking;

        -- Read the flight's price BEFORE the Booking insert, and
        -- as a separate statement, so Flight is not "in use" by the INSERT statement
        -- itself -- MySQL forbids an AFTER INSERT trigger on Booking from updating a
        -- table that the triggering INSERT statement already references.
        SELECT TicketPrice INTO v_ticket
          FROM Flight WHERE FlightID = p_FlightID;
        SET v_fare = ROUND(v_ticket * v_mult * p_NumPax, 2);
        SET v_tax  = ROUND(v_fare * 0.12, 2);
        SET v_ref  = CONCAT('PNR', UPPER(SUBSTRING(MD5(RAND()), 1, 6)));

        INSERT INTO Booking (
            PassengerID, FlightID, SeatID, BookingReference, BookingDate, BookingTime,
            NumberOfPassengers, BookingStatus, Discount, Tax, TotalFare,
            BookingChannel, TravelInsurance, CreatedBy
        ) VALUES (
            p_PassengerID, p_FlightID, p_SeatID, v_ref, CURDATE(), CURTIME(),
            p_NumPax, 'Confirmed', 0.00, v_tax, (v_fare + v_tax),
            p_Channel, FALSE, 'sp_BookSeat'
        );

        -- If anything above fails, roll back only to the savepoint instead of the whole
        -- transaction; here we simply demonstrate a successful path and commit.
        SET p_BookingRef = v_ref;
        COMMIT;
    END IF;
END$$

-- Procedure 3: Cancel a booking, compute cancellation charge/refund, and log it.
-- The AFTER INSERT trigger on Cancellation (Section 8) synchronizes Booking, Seat
-- and Flight state automatically.
CREATE PROCEDURE sp_CancelBooking(
    IN p_BookingID INT,
    IN p_Reason    VARCHAR(150)
)
BEGIN
    DECLARE v_fare   DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_charge DECIMAL(10,2);
    DECLARE v_refund DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT TotalFare, BookingStatus INTO v_fare, v_status
      FROM Booking WHERE BookingID = p_BookingID FOR UPDATE;

    IF v_status IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking not found';
    ELSEIF v_status = 'Cancelled' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking is already cancelled';
    ELSE
        SET v_charge = ROUND(v_fare * 0.10, 2);
        SET v_refund = ROUND(v_fare - v_charge, 2);

        INSERT INTO Cancellation (
            BookingID, CancellationDate, CancellationTime, Reason, RefundAmount,
            CancellationCharges, RefundStatus, CancellationStatus, ProcessedBy, RefundMode
        ) VALUES (
            p_BookingID, CURDATE(), CURTIME(), p_Reason, v_refund,
            v_charge, 'Pending', 'Requested', 'sp_CancelBooking', 'Original Payment Method'
        );

        COMMIT;
    END IF;
END$$

-- Procedure 4: Revenue and load-factor report for a single flight
CREATE PROCEDURE sp_FlightRevenueReport(IN p_FlightID INT)
BEGIN
    SELECT
        f.FlightID, f.FlightNumber, f.AirlineName, f.DepartureDate,
        COUNT(b.BookingID)                                                       AS TotalBookings,
        SUM(CASE WHEN b.BookingStatus = 'Cancelled' THEN 1 ELSE 0 END)           AS CancelledBookings,
        ROUND(SUM(CASE WHEN b.BookingStatus <> 'Cancelled' THEN b.TotalFare ELSE 0 END), 2) AS NetRevenue,
        fn_FlightOccupancyPercent(f.FlightID)                                    AS OccupancyPercent
    FROM Flight f
    LEFT JOIN Booking b ON b.FlightID = f.FlightID
    WHERE f.FlightID = p_FlightID
    GROUP BY f.FlightID, f.FlightNumber, f.AirlineName, f.DepartureDate;
END$$

DELIMITER ;

-- =====================================================================================
-- SECTION 8: TRIGGERS
-- =====================================================================================

DELIMITER $$

-- Trigger 1: Normalize passenger email to lowercase before it is stored
CREATE TRIGGER trg_passenger_before_insert
BEFORE INSERT ON Passenger
FOR EACH ROW
BEGIN
    SET NEW.Email = LOWER(NEW.Email);
END$$

-- Trigger 2: Guard against booking a seat that is not Available or belongs to
-- a different flight than the one being booked
CREATE TRIGGER trg_booking_before_insert
BEFORE INSERT ON Booking
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_flight INT;

    SELECT SeatStatus, FlightID INTO v_status, v_flight
      FROM Seat WHERE SeatID = NEW.SeatID;

    IF v_flight <> NEW.FlightID THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seat/Flight mismatch on booking insert';
    ELSEIF v_status = 'Booked' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot book a seat that is already booked';
    END IF;
END$$

-- Trigger 3: When a booking is confirmed, mark the seat Booked and decrement
-- the flight's AvailableSeats counter
CREATE TRIGGER trg_booking_after_insert
AFTER INSERT ON Booking
FOR EACH ROW
BEGIN
    IF NEW.BookingStatus <> 'Cancelled' THEN
        UPDATE Seat SET SeatStatus = 'Booked' WHERE SeatID = NEW.SeatID;
        UPDATE Flight SET AvailableSeats = AvailableSeats - 1
         WHERE FlightID = NEW.FlightID AND AvailableSeats > 0;
    END IF;
END$$

-- Trigger 4: When a cancellation is logged, free the seat, restore flight
-- inventory and flip the booking status to Cancelled
CREATE TRIGGER trg_cancellation_after_insert
AFTER INSERT ON Cancellation
FOR EACH ROW
BEGIN
    DECLARE v_seat_id  INT;
    DECLARE v_flight_id INT;

    SELECT SeatID, FlightID INTO v_seat_id, v_flight_id
      FROM Booking WHERE BookingID = NEW.BookingID;

    UPDATE Booking SET BookingStatus = 'Cancelled' WHERE BookingID = NEW.BookingID;
    UPDATE Seat SET SeatStatus = 'Available' WHERE SeatID = v_seat_id;
    UPDATE Flight SET AvailableSeats = LEAST(TotalSeats, AvailableSeats + 1) WHERE FlightID = v_flight_id;
END$$

-- Trigger 5: Automatically flag very low ratings for moderation
CREATE TRIGGER trg_review_before_insert
BEFORE INSERT ON Review
FOR EACH ROW
BEGIN
    IF NEW.Rating = 1 THEN
        SET NEW.ReviewStatus = 'Flagged';
    END IF;
END$$

DELIMITER ;

-- =====================================================================================
-- SECTION 9: TRANSACTION DEMONSTRATION (COMMIT / ROLLBACK / SAVEPOINT)
-- =====================================================================================

-- Demonstrates a multi-step booking + baggage update wrapped in one transaction,
-- using a SAVEPOINT to undo only the baggage step while keeping the booking update.
START TRANSACTION;

    UPDATE Booking
       SET CouponCode = 'DEMO10', Discount = 500.00
     WHERE BookingID = 500001;

    SAVEPOINT before_baggage_update;

    UPDATE Baggage
       SET BaggageStatus = 'Lost'
     WHERE BookingID = 500001;

    -- On reflection the baggage status change was inserted by mistake; undo only
    -- that part while keeping the coupon/discount change applied above.
    ROLLBACK TO SAVEPOINT before_baggage_update;

COMMIT;

-- =====================================================================================
-- SECTION 10: ALTER TABLE EXAMPLES
-- =====================================================================================

ALTER TABLE Passenger
    ADD COLUMN LoyaltyPoints INT NOT NULL DEFAULT 0 AFTER FlightsTaken;

ALTER TABLE Flight
    MODIFY COLUMN AirlineName VARCHAR(80) NOT NULL;

ALTER TABLE Booking
    ADD CONSTRAINT chk_booking_total_fare_nonneg CHECK (TotalFare >= 0);

ALTER TABLE Seat
    ADD COLUMN LastInspectedOn DATE NULL AFTER USBPort;

-- =====================================================================================
-- SECTION 11: UPDATE EXAMPLES
-- =====================================================================================

UPDATE Passenger
   SET LoyaltyPoints = FlightsTaken * 100
 WHERE FlightsTaken > 0;

UPDATE Passenger
   SET FrequentFlyerMembership = fn_LoyaltyTier(FlightsTaken)
 WHERE 1 = 1;

UPDATE Flight
   SET FlightStatus = 'Delayed'
 WHERE FlightStatus = 'Scheduled'
   AND DepartureDate = (SELECT min_d FROM (SELECT MIN(DepartureDate) AS min_d FROM Flight WHERE FlightStatus = 'Scheduled') AS tmp);

UPDATE Booking
   SET TravelInsurance = TRUE
 WHERE BookingChannel = 'Travel Agent' AND TravelInsurance = FALSE;

-- =====================================================================================
-- SECTION 12: DELETE EXAMPLES
-- =====================================================================================

-- Remove pending, unflagged, low-value reviews (safe: Review has no dependent child rows)
DELETE FROM Review
 WHERE ReviewStatus = 'Pending' AND Rating <= 2;

-- Remove baggage records that were logged against a booking that no longer exists
-- (defensive cleanup; ON DELETE CASCADE normally prevents orphans)
DELETE bg FROM Baggage bg
LEFT JOIN Booking b ON b.BookingID = bg.BookingID
WHERE b.BookingID IS NULL;

-- =====================================================================================
-- SECTION 13: INSERT EXAMPLES (AD-HOC, POST-LOAD)
-- =====================================================================================

INSERT INTO Passenger (
    FirstName, MiddleName, LastName, Gender, DOB, Email, Phone, PassportNumber,
    Nationality, Address, City, State, Country, ZipCode, FrequentFlyerMembership,
    FlightsTaken, MealPreference, SeatPreference, EmergencyContact, GovernmentID
) VALUES (
    'Ananya', NULL, 'Rathi', 'Female', '1997-04-14', 'ananya.rathi.new@mailhub.com',
    '+919812345670', 'Z1234567', 'Indian', '12 Residency Road', 'Pune', 'Maharashtra',
    'India', '411001', 'None', 0, 'Veg', 'Window', '+919812345671', 'GOV00099001'
);

-- Book a seat for the newly inserted passenger through the stored procedure
SET @new_pid  = (SELECT PassengerID FROM Passenger WHERE Email = 'ananya.rathi.new@mailhub.com');
SET @new_seat = (SELECT SeatID FROM Seat WHERE FlightID = 20001 AND SeatStatus = 'Available' ORDER BY SeatID LIMIT 1);

CALL sp_BookSeat(@new_pid, 20001, @new_seat, 1, 'Website', @new_booking_ref);

SELECT @new_booking_ref AS GeneratedBookingReference;

-- =====================================================================================
-- SECTION 14: 40+ ADVANCED SELECT QUERIES
-- =====================================================================================

-- Query 1: Basic filter with ORDER BY and LIMIT -- most expensive flights
SELECT FlightID, FlightNumber, AirlineName, TicketPrice
FROM Flight
ORDER BY TicketPrice DESC
LIMIT 5;

-- Query 2: Passengers from India, alphabetically sorted, first 10
SELECT PassengerID, FirstName, LastName, City, Country
FROM Passenger
WHERE Country = 'India'
ORDER BY LastName ASC, FirstName ASC
LIMIT 10;

-- Query 3: Flights departing between two dates
SELECT FlightNumber, AirlineName, SourceAirport, DestinationAirport, DepartureDate
FROM Flight
WHERE DepartureDate BETWEEN '2026-09-01' AND '2026-09-30'
ORDER BY DepartureDate;

-- Query 4: Bookings made through the mobile app, most recent first
SELECT BookingID, BookingReference, BookingDate, TotalFare
FROM Booking
WHERE BookingChannel = 'Mobile App'
ORDER BY BookingDate DESC
LIMIT 15;

-- Query 5: Top 5 heaviest checked baggage items
SELECT BaggageID, TagNumber, BagWeight, ExtraWeight, ExtraCharge
FROM Baggage
ORDER BY BagWeight DESC
LIMIT 5;

-- Query 6: Aggregate -- total, average, min and max ticket price by airline
SELECT AirlineName,
       COUNT(*)            AS FlightCount,
       ROUND(AVG(TicketPrice), 2) AS AvgPrice,
       MIN(TicketPrice)    AS MinPrice,
       MAX(TicketPrice)    AS MaxPrice
FROM Flight
GROUP BY AirlineName
ORDER BY AvgPrice DESC;

-- Query 7: Aggregate -- total revenue collected via Payment by payment method
SELECT PaymentMethod,
       COUNT(*)                AS TransactionCount,
       ROUND(SUM(TotalAmount), 2) AS TotalCollected
FROM Payment
WHERE PaymentStatus = 'Success'
GROUP BY PaymentMethod
ORDER BY TotalCollected DESC;

-- Query 8: Aggregate -- average rating per airline (via joined flight)
SELECT f.AirlineName,
       COUNT(r.ReviewID)       AS ReviewCount,
       ROUND(AVG(r.Rating), 2) AS AvgRating
FROM Review r
JOIN Flight f ON f.FlightID = r.FlightID
GROUP BY f.AirlineName
ORDER BY AvgRating DESC;

-- Query 9: GROUP BY + HAVING -- airlines with more than 2 flights
SELECT AirlineName, COUNT(*) AS FlightCount
FROM Flight
GROUP BY AirlineName
HAVING COUNT(*) > 2
ORDER BY FlightCount DESC;

-- Query 10: GROUP BY + HAVING -- passengers with total spend above 50,000
SELECT b.PassengerID, ROUND(SUM(b.TotalFare), 2) AS TotalSpend
FROM Booking b
WHERE b.BookingStatus <> 'Cancelled'
GROUP BY b.PassengerID
HAVING SUM(b.TotalFare) > 50000
ORDER BY TotalSpend DESC;

-- Query 11: GROUP BY + HAVING -- routes with average occupied seats over threshold
SELECT SourceAirport, DestinationAirport,
       ROUND(AVG(TotalSeats - AvailableSeats), 2) AS AvgSeatsBooked
FROM Flight
GROUP BY SourceAirport, DestinationAirport
HAVING AVG(TotalSeats - AvailableSeats) >= 1
ORDER BY AvgSeatsBooked DESC;

-- Query 12: GROUP BY + HAVING -- destinations receiving more than 5 bookings
SELECT f.DestinationAirport, COUNT(b.BookingID) AS BookingCount
FROM Booking b
JOIN Flight f ON f.FlightID = b.FlightID
GROUP BY f.DestinationAirport
HAVING COUNT(b.BookingID) > 5
ORDER BY BookingCount DESC;

-- Query 13: INNER JOIN -- booking with passenger and flight details
SELECT b.BookingReference, p.FirstName, p.LastName, f.FlightNumber, f.DepartureDate
FROM Booking b
INNER JOIN Passenger p ON p.PassengerID = b.PassengerID
INNER JOIN Flight f    ON f.FlightID    = b.FlightID
ORDER BY f.DepartureDate
LIMIT 20;

-- Query 14: INNER JOIN -- seat and booking, showing class and fare
SELECT s.SeatNumber, s.SeatClass, b.BookingReference, b.TotalFare
FROM Seat s
INNER JOIN Booking b ON b.SeatID = s.SeatID
ORDER BY b.TotalFare DESC
LIMIT 10;

-- Query 15: INNER JOIN -- payment reconciled against booking and passenger
SELECT pay.TransactionID, pay.TotalAmount, pay.PaymentStatus,
       p.FirstName, p.LastName, b.BookingReference
FROM Payment pay
INNER JOIN Booking b    ON b.BookingID    = pay.BookingID
INNER JOIN Passenger p  ON p.PassengerID  = b.PassengerID
WHERE pay.PaymentStatus = 'Success'
ORDER BY pay.PaymentDate DESC
LIMIT 15;

-- Query 16: INNER JOIN -- three-way join across baggage, booking and flight
SELECT bg.TagNumber, bg.BagWeight, f.FlightNumber, f.DepartureDate
FROM Baggage bg
INNER JOIN Booking b ON b.BookingID = bg.BookingID
INNER JOIN Flight f  ON f.FlightID  = b.FlightID
WHERE bg.BaggageStatus = 'Lost';

-- Query 17: INNER JOIN -- cancellations with passenger and refund details
SELECT c.CancellationID, p.FirstName, p.LastName, c.Reason, c.RefundAmount, c.RefundStatus
FROM Cancellation c
INNER JOIN Booking b   ON b.BookingID   = c.BookingID
INNER JOIN Passenger p ON p.PassengerID = b.PassengerID
ORDER BY c.CancellationDate DESC;

-- Query 18: LEFT JOIN -- every passenger with their booking count (including zero)
SELECT p.PassengerID, CONCAT(p.FirstName,' ',p.LastName) AS PassengerName,
       COUNT(b.BookingID) AS BookingCount
FROM Passenger p
LEFT JOIN Booking b ON b.PassengerID = p.PassengerID
GROUP BY p.PassengerID, PassengerName
ORDER BY BookingCount DESC;

-- Query 19: LEFT JOIN -- every flight with review count (including flights with none)
SELECT f.FlightID, f.FlightNumber, COUNT(r.ReviewID) AS ReviewCount
FROM Flight f
LEFT JOIN Review r ON r.FlightID = f.FlightID
GROUP BY f.FlightID, f.FlightNumber
ORDER BY ReviewCount ASC;

-- Query 20: LEFT JOIN -- bookings with or without an associated cancellation record
SELECT b.BookingID, b.BookingReference, b.BookingStatus, c.CancellationStatus
FROM Booking b
LEFT JOIN Cancellation c ON c.BookingID = b.BookingID
ORDER BY b.BookingID
LIMIT 20;

-- Query 21: LEFT JOIN -- passengers who have never left a review
SELECT p.PassengerID, p.FirstName, p.LastName
FROM Passenger p
LEFT JOIN Review r ON r.PassengerID = p.PassengerID
WHERE r.ReviewID IS NULL;

-- Query 22: RIGHT JOIN -- every seat shown against its flight (including any
-- flight rows with mismatched joins, demonstrating RIGHT JOIN direction)
SELECT f.FlightNumber, s.SeatNumber, s.SeatClass, s.SeatStatus
FROM Booking b
RIGHT JOIN Seat s ON s.SeatID = b.SeatID
RIGHT JOIN Flight f ON f.FlightID = s.FlightID
WHERE s.FlightID = 20001
ORDER BY s.SeatNumber;

-- Query 23: RIGHT JOIN -- all payments shown against bookings (booking as the right table)
SELECT b.BookingReference, pay.TransactionID, pay.PaymentStatus
FROM Payment pay
RIGHT JOIN Booking b ON b.BookingID = pay.BookingID
ORDER BY b.BookingID
LIMIT 20;

-- Query 24: RIGHT JOIN -- all flights shown against seats (flight as the right table)
SELECT s.SeatClass, COUNT(s.SeatID) AS SeatCount, f.FlightNumber
FROM Seat s
RIGHT JOIN Flight f ON f.FlightID = s.FlightID
GROUP BY f.FlightNumber, s.SeatClass
ORDER BY f.FlightNumber, s.SeatClass
LIMIT 20;

-- Query 25: Subquery -- flights priced above the overall average ticket price
SELECT FlightNumber, AirlineName, TicketPrice
FROM Flight
WHERE TicketPrice > (SELECT AVG(TicketPrice) FROM Flight)
ORDER BY TicketPrice DESC;

-- Query 26: Subquery -- passengers who have made at least one booking
SELECT PassengerID, FirstName, LastName
FROM Passenger
WHERE PassengerID IN (SELECT DISTINCT PassengerID FROM Booking);

-- Query 27: Subquery -- passengers who have never made a booking
SELECT PassengerID, FirstName, LastName
FROM Passenger
WHERE PassengerID NOT IN (SELECT DISTINCT PassengerID FROM Booking);

-- Query 28: Subquery -- seats currently available on the cheapest flight
SELECT SeatNumber, SeatClass, SeatStatus
FROM Seat
WHERE FlightID = (SELECT FlightID FROM Flight ORDER BY TicketPrice ASC LIMIT 1)
  AND SeatStatus = 'Available';

-- Query 29: Subquery in SELECT list -- booking count per passenger via scalar subquery
SELECT p.PassengerID, p.FirstName, p.LastName,
       (SELECT COUNT(*) FROM Booking b WHERE b.PassengerID = p.PassengerID) AS BookingCount
FROM Passenger p
ORDER BY BookingCount DESC
LIMIT 10;

-- Query 30: Subquery -- bookings whose fare exceeds the average fare of their own flight
SELECT b.BookingID, b.FlightID, b.TotalFare
FROM Booking b
WHERE b.TotalFare > (
    SELECT AVG(b2.TotalFare) FROM Booking b2 WHERE b2.FlightID = b.FlightID
);

-- Query 31: Correlated subquery -- most expensive booking per flight
SELECT b.BookingID, b.FlightID, b.TotalFare
FROM Booking b
WHERE b.TotalFare = (
    SELECT MAX(b2.TotalFare) FROM Booking b2 WHERE b2.FlightID = b.FlightID
)
ORDER BY b.FlightID;

-- Query 32: Correlated subquery -- passengers whose age is above the average age
-- of passengers from the same country
SELECT p.PassengerID, p.FirstName, p.LastName, p.Country, fn_CalculateAge(p.DOB) AS Age
FROM Passenger p
WHERE fn_CalculateAge(p.DOB) > (
    SELECT AVG(fn_CalculateAge(p2.DOB)) FROM Passenger p2 WHERE p2.Country = p.Country
)
ORDER BY p.Country;

-- Query 33: Correlated subquery -- flights with above-average occupancy for their airline
SELECT f.FlightNumber, f.AirlineName, (f.TotalSeats - f.AvailableSeats) AS SeatsBooked
FROM Flight f
WHERE (f.TotalSeats - f.AvailableSeats) > (
    SELECT AVG(f2.TotalSeats - f2.AvailableSeats)
    FROM Flight f2
    WHERE f2.AirlineName = f.AirlineName
);

-- Query 34: Correlated subquery with EXISTS -- passengers who have cancelled at least one booking
SELECT p.PassengerID, p.FirstName, p.LastName
FROM Passenger p
WHERE EXISTS (
    SELECT 1 FROM Booking b
    WHERE b.PassengerID = p.PassengerID AND b.BookingStatus = 'Cancelled'
);

-- Query 35: Correlated subquery with NOT EXISTS -- flights that have received no reviews
SELECT f.FlightID, f.FlightNumber
FROM Flight f
WHERE NOT EXISTS (
    SELECT 1 FROM Review r WHERE r.FlightID = f.FlightID
);

-- Query 36: Multi-table JOIN + GROUP BY + HAVING + ORDER BY -- top spending passengers
-- with more than one confirmed booking
SELECT p.PassengerID, CONCAT(p.FirstName,' ',p.LastName) AS PassengerName,
       COUNT(b.BookingID) AS ConfirmedBookings,
       ROUND(SUM(b.TotalFare), 2) AS TotalSpend
FROM Passenger p
JOIN Booking b ON b.PassengerID = p.PassengerID
WHERE b.BookingStatus = 'Confirmed'
GROUP BY p.PassengerID, PassengerName
HAVING COUNT(b.BookingID) > 1
ORDER BY TotalSpend DESC;

-- Query 37: Aggregate + JOIN -- baggage extra charges collected per flight
SELECT f.FlightNumber, ROUND(SUM(bg.ExtraCharge), 2) AS TotalExtraBaggageRevenue
FROM Baggage bg
JOIN Booking b ON b.BookingID = bg.BookingID
JOIN Flight f  ON f.FlightID  = b.FlightID
GROUP BY f.FlightNumber
HAVING SUM(bg.ExtraCharge) > 0
ORDER BY TotalExtraBaggageRevenue DESC;

-- Query 38: Window function -- rank flights by net revenue
SELECT f.FlightNumber, f.AirlineName,
       ROUND(SUM(b.TotalFare), 2) AS Revenue,
       RANK() OVER (ORDER BY SUM(b.TotalFare) DESC) AS RevenueRank
FROM Flight f
JOIN Booking b ON b.FlightID = f.FlightID
WHERE b.BookingStatus <> 'Cancelled'
GROUP BY f.FlightID, f.FlightNumber, f.AirlineName
ORDER BY Revenue DESC
LIMIT 10;

-- Query 39: CASE expression -- categorize bookings by fare tier
SELECT BookingID, TotalFare,
       CASE
           WHEN TotalFare >= 40000 THEN 'Premium'
           WHEN TotalFare >= 15000 THEN 'Standard'
           ELSE 'Budget'
       END AS FareTier
FROM Booking
ORDER BY TotalFare DESC
LIMIT 20;

-- Query 40: Aggregate -- cancellation rate per airline
SELECT f.AirlineName,
       COUNT(b.BookingID) AS TotalBookings,
       SUM(CASE WHEN b.BookingStatus = 'Cancelled' THEN 1 ELSE 0 END) AS Cancelled,
       ROUND(SUM(CASE WHEN b.BookingStatus = 'Cancelled' THEN 1 ELSE 0 END) * 100.0
             / COUNT(b.BookingID), 2) AS CancellationRatePercent
FROM Booking b
JOIN Flight f ON f.FlightID = b.FlightID
GROUP BY f.AirlineName
ORDER BY CancellationRatePercent DESC;

-- Query 41: DISTINCT + ORDER BY -- unique routes currently scheduled
SELECT DISTINCT SourceAirport, DestinationAirport
FROM Flight
WHERE FlightStatus = 'Scheduled'
ORDER BY SourceAirport, DestinationAirport;

-- Query 42: Multi-condition WHERE + LIKE -- passengers with Gmail-style emails from Maharashtra
SELECT PassengerID, FirstName, LastName, Email, State
FROM Passenger
WHERE State = 'Maharashtra' AND Email LIKE '%@mailhub.com'
ORDER BY LastName;

-- Query 43: Aggregate with ROUND and GROUP BY on derived expression -- fare per seat class
SELECT s.SeatClass,
       COUNT(b.BookingID)          AS BookingsInClass,
       ROUND(AVG(b.TotalFare), 2)  AS AvgFare
FROM Booking b
JOIN Seat s ON s.SeatID = b.SeatID
GROUP BY s.SeatClass
ORDER BY AvgFare DESC;

-- Query 44: Using the views created in Section 5
SELECT * FROM vw_FlightOccupancy ORDER BY OccupancyPercent DESC LIMIT 10;

SELECT * FROM vw_TopRatedFlights ORDER BY AvgRating DESC LIMIT 10;

-- Query 45: Calling a stored function directly in a SELECT
SELECT PassengerID, FirstName, LastName, FlightsTaken,
       fn_LoyaltyTier(FlightsTaken) AS ComputedTier
FROM Passenger
ORDER BY FlightsTaken DESC
LIMIT 10;
