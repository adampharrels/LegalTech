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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
