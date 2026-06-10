# Development Guide

## Local Development Setup

### Quick Start

```bash
# 1. Navigate to project root
cd /Users/adam/LegalTech

# 2. Set up backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed

# 3. Start backend (Terminal 1)
npx ts-node src/index.ts
# Server runs on http://localhost:3001

# 4. In a new terminal, set up frontend
cd frontend
npm install

# 5. Start frontend (Terminal 2)
npm run dev
# App available at http://localhost:3000
```

## Database Management

### Reset Database
```bash
cd backend
rm -f prisma/dev.db
npx prisma migrate dev --name init
npx prisma db seed
```

### View Database
```bash
cd backend
npx prisma studio
# Opens Prisma Studio at http://localhost:5555
```

### Create New Migration
```bash
cd backend
npx prisma migrate dev --name "description_of_change"
```

## Code Structure

### Backend (`/backend`)

#### `src/index.ts`
- Express server setup with CORS
- API route handlers for cases, issues, and legal areas
- Prisma Client initialization

#### `prisma/schema.prisma`
- Data model definitions
- Relationships between entities
- Indexes and constraints

#### `prisma/seed.ts`
- Initial data seeding script
- Taxonomy population (issues, legal areas)
- Example case data

### Frontend (`/frontend`)

#### `src/app/`
- Next.js App Router pages
- `page.tsx`: Home page
- `cases/page.tsx`: Case explorer with filters
- `cases/[slug]/page.tsx`: Detailed case view
- `dashboard/page.tsx`: Intelligence dashboard
- `admin/page.tsx`: Admin panel for case management

#### `src/actions/`
- Server Actions for data fetching
- `cases.ts`: Case-related server actions
- `admin.ts`: Admin operations (create, delete, update)

#### `src/components/`
- Reusable React components
- `Header.tsx`: Navigation and branding
- `FilterSidebar.tsx`: Interactive filters for case explorer

#### `src/app/globals.css`
- Tailwind CSS configuration
- Custom utilities (glass, glass-card, text-gradient, etc.)
- CSS variables for theming

## Workflow: Adding a New Case

### 1. Via Admin Panel (UI)
1. Navigate to `/admin`
2. Fill out the "Add Basic Case" form
3. Submit to create case entry
4. Visit case detail page to view

### 2. Via Seed File (Programmatic)
1. Edit `backend/prisma/seed.ts`
2. Add case creation code following existing pattern
3. Link to issues and legal areas
4. Add parties and events if needed
5. Reset database and reseed

### Example: Add Case Programmatically
```typescript
const newCase = await prisma.case.upsert({
  where: { slug: 'case-slug' },
  update: {},
  create: {
    slug: 'case-slug',
    caseName: 'Party A v Party B',
    jurisdiction: 'United States',
    country: 'USA',
    courtName: 'Court Name',
    courtLevel: 'District Court',
    statusPublic: 'Active',
    statusInternal: 'Discovery',
    materialityScore: 'High',
    summaryShort: 'Brief summary...',
    summaryLong: 'Detailed summary...',
    whyItMatters: 'Why this case is important...',
  }
})

// Link to issues
const issue = await prisma.issue.findUnique({ where: { name: 'Issue Name' } })
if (issue) {
  await prisma.caseIssue.create({
    data: { caseId: newCase.id, issueId: issue.id }
  }).catch(() => {})
}

// Add parties
await prisma.party.create({
  data: {
    caseId: newCase.id,
    name: 'Party Name',
    role: 'plaintiff',
    partyType: 'company'
  }
}).catch(() => {})

// Add events
await prisma.event.create({
  data: {
    caseId: newCase.id,
    eventDate: new Date('2024-01-01'),
    eventType: 'Filing',
    title: 'Event Title',
    description: 'Event description'
  }
}).catch(() => {})
```

## Workflow: Implementing a New Filter

### 1. Add Filter to FilterSidebar Component
```tsx
// frontend/src/components/FilterSidebar.tsx
<Link 
  href={`/cases?newFilter=${value}`}
  className="block px-3 py-2 rounded-md hover:bg-primary/10 text-sm transition-colors"
>
  Filter Value
</Link>
```

### 2. Update Backend API
```typescript
// backend/src/index.ts
if (newFilter) {
  where.fieldName = String(newFilter);
}
```

### 3. Update Frontend Server Actions
```typescript
// frontend/src/actions/cases.ts
export async function getCases(filters?: {
  newFilter?: string;
  // ... other filters
}) {
  const params = new URLSearchParams();
  if (filters?.newFilter) params.append('newFilter', filters.newFilter);
  // ... fetch
}
```

## Testing

### Manual Testing Flow

1. **Homepage**: Verify hero section loads and buttons navigate
2. **Case Explorer**: 
   - Check all cases display
   - Click filter links, verify case list filters
   - Click case cards, verify navigation to detail
3. **Case Detail**:
   - Verify all information displays
   - Check timeline renders correctly
   - Verify issue/legal area classifications
4. **Dashboard**:
   - Check KPI cards show correct counts
   - Verify jurisdiction bar chart renders
5. **Admin Panel**:
   - Test creating new case
   - Test deleting case
   - Verify changes reflect on explorer

### API Testing

```bash
# Test cases endpoint
curl http://localhost:3001/api/cases

# Test case by slug
curl http://localhost:3001/api/cases/ny-times-v-openai

# Test issues
curl http://localhost:3001/api/issues

# Test legal areas
curl http://localhost:3001/api/legal-areas

# Create case
curl -X POST http://localhost:3001/api/cases \
  -H "Content-Type: application/json" \
  -d '{"caseName": "Test Case", "jurisdiction": "Test", "country": "Test", "courtName": "Test", "statusPublic": "Active", "materialityScore": "High", "summaryShort": "Test"}'
```

## Common Issues & Solutions

### Issue: Backend won't start
**Solution**: 
```bash
cd backend
npm install
npx tsc --noEmit  # Check for TS errors
npx ts-node src/index.ts  # Try direct execution
```

### Issue: Database locked error
**Solution**:
```bash
cd backend
rm -f prisma/dev.db
npx prisma migrate dev --name init
```

### Issue: API calls return 404
**Verify**:
- Backend is running on `http://localhost:3001`
- Frontend `.env.local` has correct `API_URL`
- Route handlers exist in backend

### Issue: Build errors in frontend
**Solution**:
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

## Performance Optimization

### Database
- Use Prisma `include` sparingly, select specific fields when possible
- Add indexes for frequently queried fields
- Consider pagination for large datasets

### Frontend
- Leverage Next.js static generation where possible
- Use server actions instead of API calls when appropriate
- Implement image optimization
- Consider pagination for case lists

## Git Workflow

### Commit Pattern
```
feat: Add new feature
fix: Fix specific issue
docs: Update documentation
refactor: Restructure code
test: Add tests
chore: Dependencies, config changes
```

### Example
```bash
git add .
git commit -m "feat: Add case timeline visualization

- Created timeline component
- Added event ordering by date
- Styled with primary color accents"
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="file:./dev.db"       # SQLite for dev, Postgres for prod
PORT=3001                          # API port
```

### Frontend (.env.local)
```
API_URL=http://localhost:3001/api  # Backend API URL
```

## TypeScript Configuration

### Backend (tsconfig.json)
- `strict`: true - Enforces strict type checking
- `verbatimModuleSyntax`: false - Allows flexible imports
- `module`: nodenext - Latest Node module system
- `target`: esnext - Latest ECMAScript features

### Frontend (tsconfig.json)
- `strict`: true - Enforces strict type checking
- `jsx`: "react-jsx" - React 17+ JSX runtime
- `noImplicitAny`: false - Allows implicit any for gradual migration

## Deployment Checklist

Before deploying to production:

- [ ] Update `DATABASE_URL` to PostgreSQL
- [ ] Set `NODE_ENV=production` in backend
- [ ] Build frontend with `npm run build`
- [ ] Set proper CORS origins
- [ ] Configure environment variables on hosting platform
- [ ] Run database migrations on production
- [ ] Test all API endpoints
- [ ] Monitor error logs

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev)
