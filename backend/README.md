# Backend Setup

## Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your credentials:
- `MONGODB_URI`: Your MongoDB connection string
- `OXAPAY_MERCHANT_API_KEY`: Your OxaPay Merchant API Key

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get a single product by ID
- `GET /api/services` - Get all services
- `GET /api/testimonials` - Get all testimonials
- `POST /api/payment/create` - Create payment request
- `POST /api/payment/callback` - OxaPay webhook callback
- `GET /api/payment/download/:orderId` - Download product (requires payment verification logic)

## Data Seeding

Initial data for products, services, and testimonials is loaded from `backend/data/` and seeded into MongoDB if the collections are empty on server startup.