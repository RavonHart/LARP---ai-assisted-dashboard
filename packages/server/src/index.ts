import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { socketService } from './services/socket.js';
import { runMigrations } from './db/migrate.js';
import apiRouter from './routes/api.js';

const app = express();
const port = process.env.PORT || 3001;

// Config Middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// API Route Handlers
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

const httpServer = createServer(app);

// Bind Socket.io service singleton
socketService.init(httpServer);

// Startup logic running database migrations first
async function bootstrap() {
  try {
    await runMigrations();
    
    httpServer.listen(port, () => {
      console.info(`[Bootstrap] Server is successfully running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('[Bootstrap] Server initialization crashed:', err);
    process.exit(1);
  }
}

bootstrap();
