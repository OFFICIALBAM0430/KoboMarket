KoboMarket

Multi-Vendor Marketplace with Wallets and Escrow

KoboMarket is a multi-vendor e-commerce marketplace built with Node.js, Express.js, MongoDB and PostgreSQL. It enables customers to discover products, manage shopping carts, place orders, make wallet-based payments, and track deliveries. Vendors can manage stores, products, orders and payout requests, while administrators oversee vendor approvals, disputes and marketplace operations.

The platform uses a dual-database architecture to separate marketplace data from financial transactions and ensure that monetary records are handled consistently.

---

1. Key Features

Authentication and User Management

- User registration and email verification.
- Secure password hashing.
- Login and JWT-based authentication.
- Access-token and refresh-token management.
- Refresh-token rotation and reuse detection.
- Logout and logout-all functionality.
- Forgot-password and password-reset workflows.
- Role-based access control.
- Login rate limiting.

Vendor Management

- Vendor store registration.
- Vendor role assignment.
- Store approval and rejection by administrators.
- Store suspension.
- Vendor-specific product and order management.

Product Management

- Product creation, updating and archiving.
- Product categories, descriptions and images.
- Product pricing stored in kobo.
- Inventory and stock management.
- Product search and filtering.
- Active-product listing.

Shopping Cart

- Add products to cart.
- Update item quantities.
- Remove individual items.
- Clear the cart.
- Product availability and stock checks.

Orders and Checkout

- Buyer checkout with idempotency protection.
- Multi-vendor order splitting.
- Parent orders and vendor-specific suborders.
- Inventory decrement during checkout.
- PostgreSQL transaction handling and account locking.
- Wallet debit and escrow credit.
- Stock compensation when checkout fails.
- Order status tracking.
- Buyer order history and vendor order management.
- Order cancellation with refund and stock restoration.

Wallet and Financial Management

- PostgreSQL-backed financial accounts.
- Wallet balances maintained in integer kobo.
- Double-entry ledger transactions.
- Buyer wallet debits and credits.
- Platform escrow, revenue and payout accounts.
- Ledger transaction references and idempotency keys.
- Protection against modification or deletion of posted ledger records.

Escrow Management

- Funds transferred from buyer wallets into platform escrow during checkout.
- Escrow funds released to vendors after eligible order completion.
- Platform fees accounted for during escrow release.
- Automatic order-completion scheduling after delivery.
- Dispute-related escrow resolution workflows.

Disputes

- Buyers can open disputes on eligible orders.
- Administrators can view open disputes.
- Full-refund, partial-refund and rejected dispute resolutions.
- Ledger-based refund and settlement handling.
- Dispute records linked to affected suborders.

Vendor Payouts

- Minimum payout amount of ₦1,000.
- Payout requests with idempotency protection.
- Paystack transfer recipient creation.
- Paystack transfer initiation.
- Payout status tracking.
- Webhook handling for successful, failed and reversed transfers.
- Ledger-based payout settlement and reversal.

Product Reviews

- Product reviews with ratings and comments.
- Purchase verification before review creation.
- Prevention of duplicate reviews.
- Review ownership checks.
- Restricted review updates.
- Product review summaries and average ratings.

Background Processing

- BullMQ job queues.
- Redis-backed background processing.
- Email notification processing.
- Automatic order-completion jobs.

---

2. Technology Stack

Component| Technology
Runtime| Node.js
Backend framework| Express.js
Document database| MongoDB
Relational database| PostgreSQL
SQL query builder and migrations| Knex.js
Cache and job queue backend| Redis
Background jobs| BullMQ
Authentication| JWT
Password hashing| bcryptjs
Validation| Joi
Payment gateway| Paystack
API documentation| Swagger
Containerization| Docker and Docker Compose
Logging| Pino

---

3. Database Architecture

KoboMarket uses MongoDB and PostgreSQL for different responsibilities.

MongoDB — Marketplace Data

MongoDB stores application and marketplace information, including:

- User profiles.
- Vendor stores.
- Products.
- Shopping carts.
- Product reviews.
- Stock adjustment records.

PostgreSQL — Financial and Transactional Data

PostgreSQL is the financial source of truth.

It stores:

- Financial accounts.
- Wallet balances.
- Financial transactions.
- Double-entry ledger records.
- Orders and suborders.
- Order items.
- Payout requests.
- Payout webhook events.
- Dispute records.

Why Two Databases?

MongoDB provides flexible document storage for marketplace information, while PostgreSQL provides relational constraints, transactions and row-level locking for financial operations.

All monetary values are represented as integer kobo rather than floating-point currency values.

For example:

- ₦1,000 = 100,000 kobo.
- ₦5,000 = 500,000 kobo.
- ₦10,000 = 1,000,000 kobo.

This avoids floating-point precision problems in financial calculations.

---

4. Financial Transaction Design

KoboMarket uses a double-entry accounting model.

Every posted financial transaction contains corresponding debit and credit entries.

The main system accounts include:

- "PLATFORM_ESCROW"
- "PLATFORM_REVENUE"
- "PLATFORM_PAYOUT_CLEARING"
- "PLATFORM_PAYOUT_SETTLED"

Checkout Flow

1. The buyer submits checkout with an idempotency key.
2. The system retrieves the cart and validates products, prices and stock.
3. Products are grouped according to their respective vendors.
4. PostgreSQL locks the relevant financial accounts.
5. The buyer's available wallet balance is checked.
6. Product stock is decremented.
7. The buyer wallet is debited.
8. Platform escrow is credited.
9. The parent order and vendor suborders are created.
10. The cart is cleared after successful checkout processing.

Escrow Release Flow

1. The vendor processes the order.
2. The vendor marks the order as shipped.
3. The order is marked as delivered.
4. A 72-hour completion job is scheduled.
5. Eligible escrow funds are released to the vendor.
6. Applicable platform fees are credited to platform revenue.

Payout Flow

1. A vendor submits a payout request.
2. The system checks the minimum payout amount.
3. The vendor's account is debited.
4. The platform payout-clearing account is credited.
5. A payout request is recorded.
6. Paystack processes the transfer.
7. Webhook events update payout status and trigger settlement or reversal ledger transactions where applicable.

---

5. Project Structure

The main project structure is organized as follows:

KoboMarket/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
│
├── src/
│   ├── config/
│   │   ├── email.js
│   │   ├── mongodb.js
│   │   ├── postgres.js
│   │   └── redis.js
│   │
│   ├── controllers/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── queues/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── workers/
│   ├── tests/
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .env.example
├── .gitignore
├── compose.yaml
├── knexfile.js
├── package.json
├── package-lock.json
├── README.md
└── server.js

Individual modules are separated into controllers, services, models, routes, validators and middleware to support maintainability and clear responsibilities.

---

6. Installation and Setup

Prerequisites

Install the following:

- Node.js and npm.
- Docker Desktop.
- Git.
- A Paystack test account for payment integration.

Step 1: Clone the Repository

git clone https://github.com/OFFICIALBAM0430/KoboMarket.git

Navigate into the project:

cd KoboMarket

Step 2: Install Dependencies

npm install

Step 3: Configure Environment Variables

Create a ".env" file in the project root using ".env.example" as the reference.

Configure the required values for:

- Application port and environment.
- MongoDB connection.
- PostgreSQL connection.
- Redis connection.
- JWT access and refresh secrets.
- Email service credentials.
- Paystack secret key.
- Paystack webhook configuration.

Do not commit real credentials or production secrets to GitHub.

Step 4: Start the Database Services

From the project root, run:

docker compose up -d

Check the running containers:

docker compose ps

The Compose configuration provides the project's database and supporting infrastructure services.

Step 5: Run Database Migrations

Create the PostgreSQL database using the database name configured in your environment.

Then run:

npx knex migrate:latest

To view migration status:

npx knex migrate:status

The migrations create the financial accounts, ledger structures, payout tables, order tables, dispute tables and other required relational structures.

Step 6: Start the Application

For development:

npm run dev

Or use the configured production/start script:

npm start

The application uses the configured port, with port "5000" as the project's development default.

---

7. API Route Overview

The API uses the "/api/v1" prefix.

Module| Base route
Authentication| "/api/v1/auth"
Vendors| "/api/v1/vendors"
Admin vendor management| "/api/v1/admin/vendors"
Products| "/api/v1/products"
Cart| "/api/v1/cart"
Orders| "/api/v1/orders"
Disputes| "/api/v1/disputes"

The application also contains wallet, payout and payment-related functionality.

Protected routes require the appropriate authentication and authorization permissions.

---

8. Security and Consistency Measures

KoboMarket incorporates the following safeguards:

- Password hashing.
- JWT-based authentication.
- Refresh-token rotation and reuse detection.
- Role-based access control.
- Login rate limiting.
- Request validation using Joi.
- Secure HTTP headers through Helmet.
- CORS configuration.
- Payment webhook signature verification.
- Idempotency keys for important financial operations.
- PostgreSQL transaction handling and row locking.
- Double-entry ledger accounting.
- Integer-kobo financial calculations.
- Restrictions on modifying posted ledger records.
- Stock validation and restoration mechanisms.
- Centralized application error handling.

---

9. Payment Integration

Paystack is used for payment-related operations.

The integration includes:

- Paystack API communication.
- Transfer recipient creation.
- Transfer initiation.
- Webhook signature verification.
- Payout success handling.
- Payout failure handling.
- Payout reversal handling.

Use Paystack test credentials for development and demonstration. Production deployment requires the appropriate live credentials and webhook configuration.

---

10. Background Jobs

Redis and BullMQ support asynchronous processing.

The background-processing architecture includes:

- Email notification jobs.
- Email worker processing.
- Delayed order-completion jobs.
- Automatic processing of eligible delivered orders after the configured 72-hour period.

Background workers are organized separately from the main application request handlers.

---

11. Development and Contribution

1. Clone the repository.
2. Install dependencies.
3. Configure the environment variables.
4. Start the Docker services.
5. Run the database migrations.
6. Start the application.
7. Create a feature branch before making changes.
8. Commit changes with descriptive messages.
9. Push changes to GitHub.

Never commit ".env" files, API secrets, database credentials or other sensitive configuration.

---

12. Project Objective

KoboMarket demonstrates the implementation of a multi-vendor marketplace with financial transaction management, wallet accounting, escrow protection, vendor payouts, order management and dispute resolution.

Its architecture separates marketplace operations from financial records, uses PostgreSQL as the source of truth for monetary balances, and applies transactional safeguards to important payment and order workflows.

Project: KoboMarket — Multi-Vendor Marketplace with Wallets and Escrow
Backend: Node.js, Express.js, MongoDB and PostgreSQL
Payment Gateway: Paystack
Job Processing: Redis and BullMQ
