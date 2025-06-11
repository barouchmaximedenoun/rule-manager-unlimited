# Rule Manager App

## Description

This application allows users to manage routing rules with priorities, sources, and destinations. It supports drag-and-drop reordering. All changes are kept in memory and only persisted to the database when the **Save** button is clicked.

## Technologies

- **Frontend**: React, Tailwind CSS, DnD Kit  
- **Backend**: Node.js, Express, MongoDB (Replica Set) with Prisma ORM

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Start MongoDB (with replica set)

```bash
cd ../backend
mkdir -p data/db
mongod --port 27019 --dbpath data/db --replSet rs0
```

In a separate terminal:

```bash
mongo --port 27019
> rs.initiate()
```

You should see `{ "ok" : 1 }` if the replica set was successfully initialized.

Then:

```bash
mongosh --port 27019
use rulesdb

db.Source.createIndex({ ruleId: 1 })
db.Destination.createIndex({ ruleId: 1 })
db.Rule.createIndex({ tenantId: 1, priority: 1 })
```

### 4. Start the backend

```bash
cd backend
cp .env.example .env
# Edit .env if needed — ensure it includes the correct DATABASE_URL and JWT_SECRET

npx prisma generate
npx prisma migrate dev --name init

# Run this after every schema change
npx prisma generate

npm start
```

The backend will be running on: [http://localhost:4001](http://localhost:4001)

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000) (or whichever port Vite outputs).

---

## Features

- Multi-tenant support
- Rule editing and priority reordering (including cross-page insertion)
- Drag-and-drop with full keyboard accessibility
- Changes tracked in-memory before saving

## Todo

- Undo/Redo history
- Batch import/export
- Role-based access control
- Tests (unit/integration)

## Notes

> The backend uses MongoDB transactions, which require a replica set — even for local development.