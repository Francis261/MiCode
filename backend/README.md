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
- `FRONTEND_URL`: URL of your frontend application (e.g., `http://localhost:8080`)
- `BACKEND_URL`: URL of your backend application (e.g., `http://localhost:5000`)

**iDrive E2 Configuration (for file storage and downloads):**
- `IDRIVE_E2_ENDPOINT`: Your iDrive E2 endpoint (e.g., `https://s3.us-west-1.idrivee2-2.com`)
- `IDRIVE_E2_ACCESS_KEY_ID`: Your iDrive E2 Access Key ID
- `IDRIVE_E2_SECRET_ACCESS_KEY`: Your iDrive E2 Secret Access Key
- `IDRIVE_E2_BUCKET_NAME`: The name of your iDrive E2 bucket

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
- `GET /api/payment/download/:orderId` - Download product (fetches from iDrive E2)

## Data Seeding

Initial data for products, services, and testimonials is loaded from `backend/data/` and seeded into MongoDB if the collections are empty on server startup.