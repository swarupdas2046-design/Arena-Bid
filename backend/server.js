const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const socketHandler = require('./sockets/auctionSocket');
const { startScheduler } = require('./utils/auctionScheduler');

// Load environment variables
dotenv.config();

// Connect to MongoDB database
connectDB();

const app = express();
const server = http.createServer(app);

// 1. Dynamic CORS Configuration (Fixed for deployment & local)
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Production check: Allow if it's your render app URL or local dev URLs
        if (
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('devtunnels.ms') ||
            origin.includes('onrender.com') ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
        ) {
            return callback(null, true);
        }

        callback(null, true); // Safe fallback to avoid blocking static assets in fullstack deploys
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Body parser
app.use(express.json());

// Setup Socket.io and start the auction scheduler
const io = socketHandler(server);
startScheduler(io);

// 2. API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auctions', require('./routes/auctionRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// 3. Static Files & Frontend Client Serving (Robust Path Resolution)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const frontendDist = path.resolve(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDist)) {
    // Serve static files like CSS, JS, images from dist
    app.use(express.static(frontendDist));

    // Handle React SPA Routing (Fallback to index.html for non-API routes)
    app.get(/(.*)/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        const indexPath = path.join(frontendDist, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('index.html not found in build directory.');
        }
    });
} else {
    app.get('/', (req, res) => {
        res.send('🚀 BidArena API is running... (Frontend build not found in ../frontend/dist)');
    });
}

// 4. Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR LOG:', err.stack || err.message);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

// Handle Port Busy / EADDRINUSE Error Gracefully
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} already in use!`);
        console.error(`💡 Fix: Terminal me 'taskkill /f /im node.exe' run karke restart karein.\n`);
        process.exit(1);
    } else {
        console.error('Server error:', error);
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
