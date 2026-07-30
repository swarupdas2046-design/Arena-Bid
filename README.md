# BidArena

BidArena is a modern real-time auction platform where users can create auctions, join live bidding rooms, place bids instantly, chat with other participants, and complete payments for winning items. The project combines a React + Vite frontend with a Node.js + Express backend, MongoDB, Socket.io, and Razorpay for end-to-end auction flow.

## Overview

BidArena is built for fast-paced, interactive bidding experiences. It focuses on:

- Real-time auction updates using Socket.io
- Server-side bid validation to prevent race conditions and invalid bids
- Anti-sniping logic with automatic timer extensions
- Scheduled auctions and auto-closing of expired listings
- Live chat inside auction rooms
- Winner payment flow via Razorpay
- User profiles and bid statistics

## Key Features

- User authentication with JWT
- Create and manage auctions
- Join live auction rooms
- Place bids with minimum increment rules
- Timer-based auction closure
- Live timeline and chat activity
- Profile stats such as auctions created, auctions won, and total bids placed
- Payment initiation and verification for winning auctions

## Tech Stack

### Frontend

- React 19
- Vite
- React Router DOM
- Tailwind CSS
- Framer Motion
- Socket.io Client
- Three.js / React Three Fiber for 3D UI elements

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- JWT for authentication
- Razorpay for payments
- Multer for image uploads

## Project Structure

```text
Arena-BID/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── utils/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json
├── start.bat
└── README.md
```

## Main Modules

### Backend

- server.js: Main Express server setup and route registration
- routes/: Defines API endpoints for auth, auctions, payments, uploads, and users
- controllers/: Handles business logic for auth, auctions, and payments
- models/: MongoDB schemas for User, Auction, Bid, ChatMessage, and Timeline
- sockets/auctionSocket.js: Real-time bidding, chat, and room events
- utils/auctionScheduler.js: Background scheduler for auction start/end and state updates

### Frontend

- App.jsx: Main routing setup
- pages/: Contains Home, Login, Register, Dashboard, CreateAuction, AuctionRoom, Profile
- components/: Reusable UI and animated elements
- context/: Auth and theme state management

## Installation

### Prerequisites

- Node.js 18+ recommended
- npm or yarn
- MongoDB instance (MongoDB Atlas or local MongoDB)
- Razorpay test account (optional for payment testing)

### 1) Clone the repository

```bash
git clone <your-repo-url>
cd Arena-BID
```

### 2) Install dependencies

```bash
npm run install:all
```

This will install dependencies for both frontend and backend.

## Environment Variables

Create a file named .env inside the backend folder based on the provided example.

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

You can also refer to backend/.env.example for the expected structure.

## Running the Project

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The frontend will typically run at:

- http://localhost:5173

The backend API will run at:

- http://localhost:5001

### Build for production

```bash
npm run build
```

## API Overview

### Authentication

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- GET /api/auth/bids

### Auctions

- GET /api/auctions
- POST /api/auctions
- GET /api/auctions/:id

### Payments

- POST /api/payment/create-order
- POST /api/payment/verify

### Uploads

- POST /api/upload

> Protected routes require a Bearer token in the Authorization header.

## How the Auction Flow Works

1. A seller creates an auction with title, description, starting bid, duration, and optional image.
2. The auction becomes active either immediately or at a scheduled time.
3. Users join the auction room and can place bids in real time.
4. Server-side validation ensures only valid bids are accepted.
5. If a bid is placed near the end, the timer may be extended to prevent sniping.
6. When the auction closes, the highest bidder becomes the winner.
7. The winner can complete payment through Razorpay.

## Notes

- The backend uses a scheduler to automatically start and close auctions.
- Auction room activity is driven by Socket.io and persisted in MongoDB.
- The project includes a 3D-themed frontend experience with animated elements.

## Future Improvements

- Add wallet balance and deposit flow
- Add auction categories and filtering
- Improve admin dashboard
- Add notifications and email alerts
- Add unit and integration tests

## License

This project is currently for educational and demo purposes.
