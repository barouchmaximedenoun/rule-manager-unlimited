# Rule Manager App

## Description

This application allows managing routing rules with priorities, sources, and destinations. It supports drag-and-drop reordering. All changes are kept in memory and saved to the database only when clicking the **Save** button.

## Technologies

- **Frontend**: React, Tailwind CSS, DnD Kit
- **Backend**: Node.js, Express, MongoDB (Replica Set)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. install
```bash
cd backend
npm install

cd ../frontend
npm install 
```
### 3. Mongodb
```bash
mkdir -p backend/data/db
mongod --dbpath backend/data/db --replSet rs0

in separate terminal
mongo
> rs.initiate()
You should see { "ok" : 1 } if the replica set was successfully initialized.
```
### 4. start backend
```bash
cd backend

cp .env.example .env
Edit .env to include your real environment values, if different
Make sure your .env contains the correct DATABASE_URL for MongoDB (or your actual database).

npx prisma generate
npx prisma migrate dev --name init

Run npx prisma generate after every schema change.

Run migrations with npx prisma migrate dev to update the database schema.

npm start

it will run on http://localhost:4000

```
### 5. start front end
```bash
cd frontend
npm run dev
launch the browser and see result
```
### 6.Done
- support for tennant
- able to edit priority or add a rule with priority outside the current page
- ...
### 7.Todo
- ...

### 8. Notes
Backend uses MongoDB transactions, so a replica set is required even for local development.
