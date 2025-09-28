require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const savedPostRoutes = require('./routes/savedPostRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/saved', savedPostRoutes);
app.use('/api/history', historyRoutes);

// Import error handler
const { handleError } = require('./utils/errorHandler');

// Error handling middleware
app.use(handleError);

const PORT = process.env.PORT || 5004;
const alternativePorts = [5007, 5008, 5009, 5010, 5011];

const tryPort = (port) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        server.close(() => resolve(true));
      });
  });
};

const startServer = async () => {
  try {
    await connectDB();
    
    // Try the main port first
    const mainPortAvailable = await tryPort(PORT);
    if (mainPortAvailable) {
      app.listen(PORT, () => {
        console.log(`Curation service running on port ${PORT}`);
      });
      return;
    }

    // Try alternative ports if main port is busy
    for (const port of alternativePorts) {
      const portAvailable = await tryPort(port);
      if (portAvailable) {
        app.listen(port, () => {
          console.log(`Curation service running on alternative port ${port}`);
        });
        return;
      }
    }

    throw new Error('All ports are in use. Please free up one of the ports or specify a different port in .env file');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
app.listen(PORT, () => {
  console.log(`Curation service running on port ${PORT}`);
});