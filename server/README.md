# Real Estate CRM — Backend Setup Instructions

## Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

## 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/real_estate_crm?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

> Replace `<username>`, `<password>`, and `<cluster>` with your MongoDB Atlas credentials.

## 2. Install Dependencies

```bash
npm install
```

## 3. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`.

## 4. Health Check

```
GET http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Real Estate CRM API is running",
  "timestamp": "...",
  "environment": "development"
}
```

---

## API Modules Overview

| Module | Base URL | Auth Required |
|--------|----------|---------------|
| Authentication | `/api/auth` | Partial |
| Properties | `/api/properties` | ✅ |
| Sellers | `/api/sellers` | ✅ |
| Buyers | `/api/buyers` | ✅ |
| Rental Properties | `/api/rentals` | ✅ |
| Tenants | `/api/tenants` | ✅ |
| Leases | `/api/leases` | ✅ |
| Dashboard | `/api/dashboard` | ✅ |
| Search & Filter | `/api/search` | ✅ |

---

## Authentication Flow

### 1. Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword"
}
```

### 2. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

Response contains a JWT token. Use it in all subsequent requests:

```
Authorization: Bearer <your_jwt_token>
```

---

## Key Endpoints Reference

### Properties
```
GET    /api/properties?page=1&limit=10&status=Available&location=Mumbai
GET    /api/properties/stats
GET    /api/properties/:id
POST   /api/properties
PUT    /api/properties/:id
DELETE /api/properties/:id
PATCH  /api/properties/:id/status
```

### Buyers (Follow-ups)
```
GET    /api/buyers/followups       # Today's & overdue follow-ups
PATCH  /api/buyers/:id/status
```

### Leases
```
GET    /api/leases/expiring        # Leases expiring in next 30 days
POST   /api/leases                 # Multipart/form-data with agreementDocument
```

### Dashboard
```
GET    /api/dashboard/stats        # All entity counts in one call
GET    /api/dashboard/charts       # Aggregated chart data
```

### Advanced Search
```
GET    /api/search/properties?location=Mumbai&minBudget=1000000&bhk=2&status=Available
GET    /api/search/buyers?location=Pune&maxBudget=5000000&bhk=3
GET    /api/search/tenants?location=Delhi&maxBudget=30000&bhk=2
GET    /api/search/rentals?location=Bangalore&maxRent=25000&furnishing=Fully+Furnished
```

---

## File Upload (Lease Agreements)

When creating or updating a lease, send a `multipart/form-data` request:

```
POST /api/leases
Content-Type: multipart/form-data

propertyRef: <property_object_id>
landlordName: John Doe
leaseStartDate: 2025-01-01
leaseEndDate: 2026-01-01
leaseAmount: 50000
agreementDocument: <file: PDF, JPEG, or PNG, max 5MB>
```

---

## Auto-Generated IDs

All entity IDs are auto-generated and follow this format:

| Entity | Format | Example |
|--------|--------|---------|
| Property | `PROP-XXXXXX` | `PROP-A3F7K2` |
| Seller | `SEL-XXXXXX` | `SEL-XB92LM` |
| Buyer | `BUY-XXXXXX` | `BUY-KP34MZ` |
| Tenant | `TEN-XXXXXX` | `TEN-R7WQ8N` |
| Lease | `LEA-XXXXXX` | `LEA-ZT6Y1P` |

---

## Status Auto-Updates

- **Lease created** → linked Property's `propertyStatus` is set to `"Leased"` automatically.
- **Rental marked Occupied** → linked Property's `propertyStatus` is set to `"Rented"` automatically.
- **Rental marked Available** → linked Property's `propertyStatus` reverts to `"Available"` automatically.

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "Property created successfully",
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 10, "pages": 10 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["contactNumber is required"]
}
```

---

## Production Deployment

```bash
NODE_ENV=production npm start
```

Make sure to:
1. Set a strong `JWT_SECRET` (32+ random characters)
2. Use MongoDB Atlas with IP whitelist configured
3. Set `CLIENT_ORIGIN` env var to your frontend domain for CORS
