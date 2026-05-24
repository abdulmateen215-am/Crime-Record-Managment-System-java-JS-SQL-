# CRMS — Criminal Record Management System
### Punjab Police Department 

---

## Project Structure

```
crms-project/
├── server.js                   ← Node.js + Express backend (Entry Point)
├── package.json                ← Dependencies
├── .env.example                ← Environment config template
│
├── config/
│   └── db.js                   ← MySQL connection pool
│
├── routes/
│   ├── criminals.js            ← /api/criminals  (CRUD + search)
│   ├── cases.js                ← /api/cases      (CRUD + status update)
│   ├── reports.js              ← /api/reports    (monthly, officers, dashboard)
│   └── lookup.js               ← /api/lookup     (dropdowns)
│
├── database/
│   └── crms_database.sql       ← Full MySQL schema + sample data (15 tables, 3NF)
│
└── public/                     ← Frontend (served by Express)
    ├── index.html              ← Main HTML page (all 6 views)
    ├── css/
    │   └── style.css           ← Complete stylesheet
    └── js/
        └── app.js              ← All frontend JS + Fetch API calls
```

---

## Setup Instructions

### Step 1 — Install MySQL & Create Database

1. Open **MySQL Workbench** or MySQL command line
2. Run the SQL file:
```sql
SOURCE path/to/crms-project/database/crms_database.sql;
```
Or in MySQL Workbench: File → Open SQL Script → select `crms_database.sql` → Run All

This creates:
- Database: `crms_db`
- All **15 normalized tables** (3NF)
- Sample data (12 criminals, 15 cases, 10 officers, 5 stations, evidence, witnesses, etc.)
- Views, Stored Procedures

---

### Step 2 — Configure Environment

```bash
cd crms-project
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=crms_db
PORT=3000
```

---

### Step 3 — Install Node.js Dependencies

```bash
npm install
```

---

### Step 4 — Start the Server

```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

---

### Step 5 — Open Browser

```
http://localhost:3000
```

---

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/criminals | All criminals with case count |
| GET | /api/criminals/cnic/:cnic | Search by CNIC |
| GET | /api/criminals/search/:name | Search by name |
| GET | /api/criminals/wanted | Most wanted list |
| GET | /api/criminals/:id | Single criminal + all cases |
| POST | /api/criminals | Add new criminal |
| PUT | /api/criminals/:id/status | Update criminal status |
| DELETE | /api/criminals/:id | Delete criminal |
| GET | /api/cases | All cases (optional ?status=Open) |
| GET | /api/cases/:id | Full case detail (criminals, officers, evidence, witnesses, victims, FIR, court) |
| POST | /api/cases | File new case |
| PUT | /api/cases/:id/status | Update case status |
| GET | /api/cases/summary/status | Status count summary |
| GET | /api/reports/dashboard | KPI numbers for dashboard |
| GET | /api/reports/monthly | Monthly case statistics |
| GET | /api/reports/officers | Officer performance |
| GET | /api/reports/crime-types | Crime type breakdown |
| GET | /api/lookup/crime-types | Crime types for dropdowns |
| GET | /api/lookup/crime-severity | Severity levels |
| GET | /api/lookup/locations | Locations + stations |
| GET | /api/lookup/stations | All police stations |
| GET | /api/lookup/officers | All officers |
| GET | /api/health | Server health check |

---

## Database — 15 Tables (3NF)

| # | Table | Type | Purpose |
|---|-------|------|---------|
| 1 | Police_Stations | Strong | Station details |
| 2 | Police_Officers | Strong | Officer profiles |
| 3 | Crime_Types | Lookup | Robbery, Murder, Drugs… |
| 4 | Crime_Severity | Lookup | Minor / Moderate / Severe |
| 5 | Locations | Strong | Crime scene areas |
| 6 | Criminals | Strong | Criminal profiles (CNIC keyed) |
| 7 | Cases | Strong | Core case records |
| 8 | Criminal_Case | Junction M:N | Criminals ↔ Cases |
| 9 | Case_Officers | Junction M:N | Cases ↔ Officers |
| 10 | Evidence | Weak | Evidence per case |
| 11 | Arrest_Records | Strong | Arrest log |
| 12 | Witnesses | Weak | Witness statements |
| 13 | Victims | Weak | Victim details |
| 14 | FIR_Complaints | Weak | First Information Reports |
| 15 | Court_Cases | Weak | Court hearing records |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MySQL 8.0 — 15 tables, 3NF, Views, Stored Procedures |
| Backend | Node.js + Express.js REST API |
| Frontend | HTML5, CSS3, Vanilla JavaScript (Fetch API) |
| Charts | Chart.js 4.4 |
| DB Driver | mysql2 with parameterized queries (SQL injection safe) |

---

## Security

- All database queries use **parameterized placeholders** (`?`) — never string concatenation
- CNIC uniqueness enforced at DB level (`UNIQUE` constraint)
- Foreign key constraints enforce referential integrity
- Input validation on all POST/PUT routes
