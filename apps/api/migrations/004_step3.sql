-- Step 3 (core business rules): customer outlets, and the amount received by the simulated provider.

-- The businesses a distributor delivers are "customer outlets" (customer_outlet), as
-- distinct from the company's own sites (sites) and the club's points of sale (charges.outlet).
-- SQLite renames the references of the other tables along with the table (foreign keys follow).
ALTER TABLE customers RENAME TO customer_outlets;
ALTER TABLE route_stops RENAME COLUMN customer_id TO customer_outlet_id;
ALTER TABLE orders RENAME COLUMN customer_id TO customer_outlet_id;
ALTER TABLE invoices RENAME COLUMN customer_id TO customer_outlet_id;

-- The simulated provider keeps the amount it actually received, which a status query now
-- reports (a confirmation needs the amount requested, as for a notification).
ALTER TABLE demo_provider_tx ADD COLUMN received_minor INTEGER;
