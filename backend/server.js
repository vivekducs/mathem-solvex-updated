// --- 0) INITIALIZATION ---
// Load environment variables and validate them FIRST
require('dotenv').config();
require('express-async-errors');

// NPM Packages
const express = require('express');

const cors = require('cors');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
const aiRoutes = require('./routes/aiRoutes');

// Local Modules
const { generateSitemap } = require('./controllers/sitemapController');
const initializeQuestionNumberCounter = require('./utils/counterInit'); 


require('./models/Question');
require('./models/Post');
require('./models/Counter');
require('./models/Taxonomy');


// --- 1) ENVIRONMENT VALIDATION ---
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('FATAL ERROR: MONGODB_URI or JWT_SECRET is not defined.');
    process.exit(1);
}


// --- 2) EXPRESS APP SETUP ---
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');


// --- 3) CORE MIDDLEWARE ---
app.use(compression());
app.use(
    helmet({
        contentSecurityPolicy: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
);

// CORS Configuration
const parseOrigins = (str) => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
};

const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? [
            ...parseOrigins(process.env.STUDENT_URL),
            ...parseOrigins(process.env.ADMIN_URL)
          ]
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS error: Origin ${origin} is not allowed by policy.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

app.use('/api/admin', (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex');
    next();
});


// --- 4) UTILITY ROUTES ---
app.get('/robots.txt', (req, res) => {
    const host = (process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/+$/, '');
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('text/plain').send(
        `User-agent: *
Allow: /

Sitemap: ${host}/sitemap.xml
`
    );
});

app.get('/sitemap.xml', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=3600');
    next();
}, generateSitemap);

// JSON endpoint for Next.js sitemap builder
const { getSitemapUrls } = require('./controllers/sitemapController');
app.get('/api/sitemap-urls', getSitemapUrls);


// --- 5) API ROUTES ---
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/taxonomy', require('./routes/taxonomyRoutes'));

app.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', uptimeSec: Math.floor(process.uptime()) });
});


// --- 6) ERROR HANDLING ---
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'An unexpected error occurred on the server.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});


// --- 7) SERVER & DATABASE STARTUP ---
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 20000,
        });

        // Ensure Mongoose text indexes are created on startup
        await mongoose.model('Question').syncIndexes();
        await mongoose.model('Post').syncIndexes();
        console.log('✅ Connected to MongoDB & indexes synced');
        console.log('Initializing/Correcting questionNumber counter...');
        await initializeQuestionNumberCounter();
        console.log('QuestionNumber counter initialization/correction complete.');
        console.log('Allowed Origins:', allowedOrigins);
        // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Could not connect to MongoDB. Exiting...');
        console.error(err);
        process.exit(1);
    }
};
startServer();


// --- 8) GRACEFUL SHUTDOWN ---
const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Closing MongoDB connection...`);
    await mongoose.connection.close();
    console.log('MongoDB connection closed. Exiting process.');
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
