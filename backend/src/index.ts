import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import candidatesRoutes from './routes/candidates';
import casesRoutes from './routes/cases';
import taxonomyRoutes from './routes/taxonomy';
import reviewsRoutes from './routes/reviews';
import lifecycleRoutes from './routes/lifecycle';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', candidatesRoutes);
app.use('/api', casesRoutes);
app.use('/api', taxonomyRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', lifecycleRoutes);

// === CASE INGESTION ===
// Note: Case ingestion is handled by the case-ingestor.ts module
// Run: npm run ingest

const PORT = Number(process.env.PORT) || 3001;
// Express 5 also calls this on failure (e.g. the port is already in use), so
// check for an error rather than always reporting success.
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(`Backend API failed to start on port ${PORT}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Backend API running on http://localhost:${PORT}`);
});
