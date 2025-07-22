// Vercel Serverless Function Entry Point
const express = require('express');

const app = express();
app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vision Menu API is running! 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    message: 'Backend API is healthy'
  });
});

// API v1 routes
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    api: 'v1',
    message: 'API v1 is working'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: ['/', '/health', '/api/v1/health', '/test']
  });
});

// Export for Vercel
module.exports = app;