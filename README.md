# 🚔 CRMS — Criminal Record Management System
### Punjab Police Department

A full-stack web application for managing criminal records, cases, evidence, FIR complaints, and court proceedings — built with Node.js, Express.js, and Microsoft SQL Server.

---

## 📌 What is CRMS?

CRMS is a digital record management system designed for the Punjab Police Department. It replaces paper-based filing with a fast, searchable web interface where officers can register criminals, file cases, attach evidence, record witnesses and victims, and generate reports — all from a browser.

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | Microsoft SQL Server (T-SQL) |
| **DB Driver** | mssql (npm) |
| **Config** | dotenv |

---

## 📁 Project Structure

```
crms-project/
├── config/
│   └── db.js              # SQL Server connection pool
├── database/
│   ├── crms_database_mssql.sql        # Main schema + sample data
│   └── crms_database_fixed_mssql.sql  # Fixed version
├── public/
│   ├── index.html         # Main frontend interface
│   ├── css/               # Stylesheets
│   └── js/                # Frontend JavaScript
├── routes/
│   ├── cases.js           # Case CRUD API endpoints
│   ├── criminals.js       # Criminal CRUD API endpoints
│   ├── lookup.js          # Dropdown data (crime types, locations, officers)
│   └── reports.js         # Dashboard & report endpoints
├── .env                   # Environment variables (not committed)
├── .env.example           # Environment variable template
├── server.js              # App entry point
└── package.json
```

---

## 🗄️ Database — 15 Tables

The database is fully normalised (3NF) and runs on Microsoft SQL Server.

| # | Table | Purpose |
|---|---|---|
| 1 | `Police_Stations` | Station info and location |
| 2 | `Police_Officers` | Officer details and badge numbers |
| 3 | `Crime_Types` | Crime categories (Robbery, Murder, Drugs…) |
| 4 | `Crime_Severity` | Minor / Moderate / Severe levels |
| 5 | `Locations` | Areas linked to stations |
| 6 | `Criminals` | Criminal profiles with CNIC |
| 7 | `Cases` | Core case records |
| 8 | `Criminal_Case` | Links criminals to cases (M:N) |
| 9 | `Case_Officers` | Links officers to cases (M:N) |
| 10 | `Evidence` | Evidence items per case |
| 11 | `Arrest_Records` | Arrest details and bail status |
| 12 | `Witnesses` | Witness statements per case |
| 13 | `Victims` | Victim details per case |
| 14 | `FIR_Complaints` | FIR registration records |
| 15 | `Court_Cases` | Court hearings and verdicts |

---

## 🚀 How to Run

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or above)
- Microsoft SQL Server + SSMS

### 1. Set up the database

Open SSMS, connect to your server, open `database/crms_database_mssql.sql` and press **F5** to run it. This creates the `crms_db` database with all tables and sample data.

### 2. Clone the repo and install dependencies

```bash
git clone https://github.com/your-username/crms-project.git
cd crms-project
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your SQL Server details:

```env
DB_SERVER=YOURPC\SQLEXPRESS
DB_NAME=crms_db
DB_USER=sa
DB_PASSWORD=your_password
PORT=3000
```

> **Note:** If your server name contains a backslash (e.g. `DESKTOP-ABC\SQLEXPRESS`), use double backslash in the `.env` file: `DESKTOP-ABC\\SQLEXPRESS`

### 4. Run the server

```bash
node server.js
```

### 5. Open in browser

```
http://localhost:3000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cases` | Get all cases |
| POST | `/api/cases` | File a new case |
| GET | `/api/cases/:id` | Get full case details |
| PUT | `/api/cases/:id/status` | Update case status |
| DELETE | `/api/cases/:id` | Delete a case |
| GET | `/api/criminals` | Get all criminals |
| POST | `/api/criminals` | Register a new criminal |
| GET | `/api/criminals/cnic/:cnic` | Search by CNIC |
| GET | `/api/criminals/search/:name` | Search by name |
| GET | `/api/criminals/wanted` | Get all wanted criminals |
| GET | `/api/lookup/crime-types` | Crime type dropdown data |
| GET | `/api/lookup/locations` | Locations dropdown data |
| GET | `/api/reports/dashboard` | Dashboard summary counts |
| GET | `/api/reports/monthly` | Monthly crime statistics |
| GET | `/api/reports/officers` | Officer performance report |

---

## ✨ Features

- ✅ Register criminals with CNIC, status (Wanted / Arrested / Released)
- ✅ File cases linked to crime type, severity and location
- ✅ Search criminals by CNIC or name
- ✅ Attach evidence, witnesses and victims to cases
- ✅ File FIR complaints and log court proceedings
- ✅ Dashboard with live counts — total criminals, open cases, wanted list
- ✅ Monthly crime statistics and officer performance reports
- ✅ Full CRUD on cases and criminals via REST API

---

## 👤 Author

Abdul Mateen | University Semester Project

---


This project was built for academic purposes.
