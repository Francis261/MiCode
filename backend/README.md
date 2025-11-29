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

- `POST /api/payment/create` - Create payment request
- `POST /api/payment/callback` - OxaPay webhook callback
- `GET /api/payment/download/:orderId` - Download product (requires payment verification logic)