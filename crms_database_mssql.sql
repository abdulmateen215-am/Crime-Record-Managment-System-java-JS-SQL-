-- ============================================================
--  CRIMINAL RECORD MANAGEMENT SYSTEM (CRMS)
--  Punjab Police Department -- Database
--  Roll # AI-25 B | NUTech | CS160 | Ms. Sumera Aslam
--  Converted: MySQL 8.0  -->  Microsoft SQL Server (T-SQL)
-- ============================================================

-- ── CREATE & SELECT DATABASE ─────────────────────────────────
-- Run the two lines below ONCE to create the database.
-- If the database already exists, just run USE crms_db.
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'crms_db')
    CREATE DATABASE crms_db;
GO

USE crms_db;
GO

-- ── DROP TABLES (reverse FK order) ───────────────────────────
IF OBJECT_ID('dbo.Court_Cases',    'U') IS NOT NULL DROP TABLE dbo.Court_Cases;
IF OBJECT_ID('dbo.FIR_Complaints', 'U') IS NOT NULL DROP TABLE dbo.FIR_Complaints;
IF OBJECT_ID('dbo.Witnesses',      'U') IS NOT NULL DROP TABLE dbo.Witnesses;
IF OBJECT_ID('dbo.Victims',        'U') IS NOT NULL DROP TABLE dbo.Victims;
IF OBJECT_ID('dbo.Arrest_Records', 'U') IS NOT NULL DROP TABLE dbo.Arrest_Records;
IF OBJECT_ID('dbo.Evidence',       'U') IS NOT NULL DROP TABLE dbo.Evidence;
IF OBJECT_ID('dbo.Case_Officers',  'U') IS NOT NULL DROP TABLE dbo.Case_Officers;
IF OBJECT_ID('dbo.Criminal_Case',  'U') IS NOT NULL DROP TABLE dbo.Criminal_Case;
IF OBJECT_ID('dbo.Cases',          'U') IS NOT NULL DROP TABLE dbo.Cases;
IF OBJECT_ID('dbo.Criminals',      'U') IS NOT NULL DROP TABLE dbo.Criminals;
IF OBJECT_ID('dbo.Locations',      'U') IS NOT NULL DROP TABLE dbo.Locations;
IF OBJECT_ID('dbo.Crime_Severity', 'U') IS NOT NULL DROP TABLE dbo.Crime_Severity;
IF OBJECT_ID('dbo.Crime_Types',    'U') IS NOT NULL DROP TABLE dbo.Crime_Types;
IF OBJECT_ID('dbo.Police_Officers','U') IS NOT NULL DROP TABLE dbo.Police_Officers;
IF OBJECT_ID('dbo.Police_Stations','U') IS NOT NULL DROP TABLE dbo.Police_Stations;
GO

-- ============================================================
--  TABLE 1: Police_Stations (Strong Entity)
-- ============================================================
CREATE TABLE Police_Stations (
    station_id      INT           PRIMARY KEY IDENTITY(1,1),
    station_name    VARCHAR(100)  NOT NULL,
    address         VARCHAR(200)  NOT NULL,
    city            VARCHAR(50)   NOT NULL DEFAULT 'Lahore',
    phone           VARCHAR(20)   NULL,
    in_charge       VARCHAR(100)  NULL,
    created_at      DATETIME2     DEFAULT SYSDATETIME()
);
GO

-- ============================================================
--  TABLE 2: Police_Officers (Strong Entity)
-- ============================================================
CREATE TABLE Police_Officers (
    officer_id      INT           PRIMARY KEY IDENTITY(1,1),
    station_id      INT           NOT NULL,
    full_name       VARCHAR(100)  NOT NULL,
    badge_number    VARCHAR(20)   NOT NULL,
    rank            VARCHAR(50)   NOT NULL,
    cnic            VARCHAR(20)   NOT NULL,
    phone           VARCHAR(20)   NULL,
    joining_date    DATE          NULL,
    created_at      DATETIME2     DEFAULT SYSDATETIME(),
    CONSTRAINT uq_officer_badge UNIQUE (badge_number),
    CONSTRAINT uq_officer_cnic  UNIQUE (cnic),
    CONSTRAINT fk_officer_station FOREIGN KEY (station_id)
        REFERENCES Police_Stations(station_id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ============================================================
--  TABLE 3: Crime_Types (Lookup)
-- ============================================================
CREATE TABLE Crime_Types (
    crime_type_id   INT           PRIMARY KEY IDENTITY(1,1),
    crime_name      VARCHAR(100)  NOT NULL,
    description     NVARCHAR(MAX) NULL,
    ipc_section     VARCHAR(50)   NULL,
    CONSTRAINT uq_crime_name UNIQUE (crime_name)
);
GO

-- ============================================================
--  TABLE 4: Crime_Severity (Lookup)
--  MySQL ENUM replaced with VARCHAR + CHECK constraint
-- ============================================================
CREATE TABLE Crime_Severity (
    severity_id     INT           PRIMARY KEY IDENTITY(1,1),
    severity_level  VARCHAR(20)   NOT NULL,
    description     NVARCHAR(MAX) NULL,
    max_penalty     VARCHAR(100)  NULL,
    CONSTRAINT uq_severity_level   UNIQUE (severity_level),
    CONSTRAINT chk_severity_level  CHECK  (severity_level IN ('Minor','Moderate','Severe'))
);
GO

-- ============================================================
--  TABLE 5: Locations (Strong Entity)
-- ============================================================
CREATE TABLE Locations (
    location_id     INT           PRIMARY KEY IDENTITY(1,1),
    station_id      INT           NOT NULL,
    area_name       VARCHAR(100)  NOT NULL,
    district        VARCHAR(100)  NOT NULL DEFAULT 'Lahore',
    province        VARCHAR(50)   NOT NULL DEFAULT 'Punjab',
    postal_code     VARCHAR(10)   NULL,
    CONSTRAINT fk_location_station FOREIGN KEY (station_id)
        REFERENCES Police_Stations(station_id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ============================================================
--  TABLE 6: Criminals (Strong Entity -- keyed by CNIC)
--  MySQL ENUM replaced with VARCHAR + CHECK constraints
--  ON UPDATE CURRENT_TIMESTAMP replaced with trigger (see below)
-- ============================================================
CREATE TABLE Criminals (
    criminal_id     INT           PRIMARY KEY IDENTITY(1,1),
    full_name       VARCHAR(100)  NOT NULL,
    cnic            VARCHAR(20)   NOT NULL,
    date_of_birth   DATE          NULL,
    gender          VARCHAR(10)   NOT NULL DEFAULT 'Male',
    address         VARCHAR(200)  NULL,
    phone           VARCHAR(20)   NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Wanted',
    photo_url       VARCHAR(255)  NULL,
    created_at      DATETIME2     DEFAULT SYSDATETIME(),
    updated_at      DATETIME2     DEFAULT SYSDATETIME(),
    CONSTRAINT uq_criminal_cnic   UNIQUE (cnic),
    CONSTRAINT chk_criminal_gender CHECK (gender IN ('Male','Female','Other')),
    CONSTRAINT chk_criminal_status CHECK (status IN ('Wanted','Arrested','Released'))
);
GO

-- Trigger: auto-update updated_at on any row change
CREATE OR ALTER TRIGGER trg_criminals_updated_at
ON Criminals
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Criminals
    SET updated_at = SYSDATETIME()
    FROM Criminals c
    INNER JOIN inserted i ON c.criminal_id = i.criminal_id;
END;
GO

-- ============================================================
--  TABLE 7: Cases (Strong Entity -- Core)
-- ============================================================
CREATE TABLE Cases (
    case_id         INT           PRIMARY KEY IDENTITY(1,1),
    crime_type_id   INT           NOT NULL,
    severity_id     INT           NOT NULL,
    location_id     INT           NOT NULL,
    case_title      VARCHAR(200)  NOT NULL,
    description     NVARCHAR(MAX) NULL,
    case_date       DATE          NOT NULL,
    status          VARCHAR(30)   NOT NULL DEFAULT 'Open',
    created_at      DATETIME2     DEFAULT SYSDATETIME(),
    updated_at      DATETIME2     DEFAULT SYSDATETIME(),
    CONSTRAINT chk_case_status CHECK (status IN ('Open','Under Investigation','Closed')),
    CONSTRAINT fk_case_crime_type FOREIGN KEY (crime_type_id)
        REFERENCES Crime_Types(crime_type_id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_case_severity FOREIGN KEY (severity_id)
        REFERENCES Crime_Severity(severity_id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_case_location FOREIGN KEY (location_id)
        REFERENCES Locations(location_id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

CREATE OR ALTER TRIGGER trg_cases_updated_at
ON Cases
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Cases
    SET updated_at = SYSDATETIME()
    FROM Cases c
    INNER JOIN inserted i ON c.case_id = i.case_id;
END;
GO

-- ============================================================
--  TABLE 8: Criminal_Case (Junction -- M:N Criminals <-> Cases)
-- ============================================================
CREATE TABLE Criminal_Case (
    criminal_case_id INT          PRIMARY KEY IDENTITY(1,1),
    criminal_id      INT          NOT NULL,
    case_id          INT          NOT NULL,
    role             VARCHAR(100) NOT NULL DEFAULT 'Primary Suspect',
    added_at         DATETIME2    DEFAULT SYSDATETIME(),
    CONSTRAINT uq_criminal_case UNIQUE (criminal_id, case_id),
    CONSTRAINT fk_cc_criminal FOREIGN KEY (criminal_id)
        REFERENCES Criminals(criminal_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cc_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ============================================================
--  TABLE 9: Case_Officers (Junction -- M:N Cases <-> Officers)
-- ============================================================
CREATE TABLE Case_Officers (
    case_officer_id  INT          PRIMARY KEY IDENTITY(1,1),
    case_id          INT          NOT NULL,
    officer_id       INT          NOT NULL,
    assigned_date    DATE         NULL,
    role             VARCHAR(100) NOT NULL DEFAULT 'Investigating Officer',
    CONSTRAINT uq_case_officer UNIQUE (case_id, officer_id),
    CONSTRAINT fk_co_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_co_officer FOREIGN KEY (officer_id)
        REFERENCES Police_Officers(officer_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ============================================================
--  TABLE 10: Evidence (Weak Entity)
-- ============================================================
CREATE TABLE Evidence (
    evidence_id      INT           PRIMARY KEY IDENTITY(1,1),
    case_id          INT           NOT NULL,
    evidence_type    VARCHAR(100)  NOT NULL,
    description      NVARCHAR(MAX) NULL,
    collected_by     INT           NULL,
    collection_date  DATE          NULL,
    storage_location VARCHAR(200)  NULL,
    CONSTRAINT fk_ev_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ev_officer FOREIGN KEY (collected_by)
        REFERENCES Police_Officers(officer_id)
        ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

-- ============================================================
--  TABLE 11: Arrest_Records (Strong Entity)
-- ============================================================
CREATE TABLE Arrest_Records (
    arrest_id        INT           PRIMARY KEY IDENTITY(1,1),
    criminal_id      INT           NOT NULL,
    case_id          INT           NOT NULL,
    officer_id       INT           NOT NULL,
    arrest_date      DATETIME2     NOT NULL,
    arrest_location  VARCHAR(200)  NULL,
    charges          NVARCHAR(MAX) NULL,
    bail_status      VARCHAR(20)   NOT NULL DEFAULT 'No Bail',
    CONSTRAINT chk_bail_status CHECK (bail_status IN ('No Bail','Bail Granted','Bail Pending')),
    CONSTRAINT fk_ar_criminal FOREIGN KEY (criminal_id)
        REFERENCES Criminals(criminal_id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_ar_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_ar_officer FOREIGN KEY (officer_id)
        REFERENCES Police_Officers(officer_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ============================================================
--  TABLE 12: Witnesses (Weak Entity)
--  MySQL BOOLEAN replaced with BIT
-- ============================================================
CREATE TABLE Witnesses (
    witness_id       INT           PRIMARY KEY IDENTITY(1,1),
    case_id          INT           NOT NULL,
    full_name        VARCHAR(100)  NOT NULL,
    cnic             VARCHAR(20)   NULL,
    phone            VARCHAR(20)   NULL,
    statement        NVARCHAR(MAX) NULL,
    statement_date   DATE          NULL,
    is_protected     BIT           NOT NULL DEFAULT 0,
    CONSTRAINT fk_wit_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ============================================================
--  TABLE 13: Victims (Weak Entity)
-- ============================================================
CREATE TABLE Victims (
    victim_id        INT           PRIMARY KEY IDENTITY(1,1),
    case_id          INT           NOT NULL,
    full_name        VARCHAR(100)  NOT NULL,
    cnic             VARCHAR(20)   NULL,
    date_of_birth    DATE          NULL,
    gender           VARCHAR(10)   NOT NULL DEFAULT 'Male',
    phone            VARCHAR(20)   NULL,
    address          VARCHAR(200)  NULL,
    injury_detail    NVARCHAR(MAX) NULL,
    CONSTRAINT chk_victim_gender CHECK (gender IN ('Male','Female','Other')),
    CONSTRAINT fk_vic_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ============================================================
--  TABLE 14: FIR_Complaints (Weak Entity)
-- ============================================================
CREATE TABLE FIR_Complaints (
    fir_id            INT           PRIMARY KEY IDENTITY(1,1),
    case_id           INT           NOT NULL,
    station_id        INT           NOT NULL,
    complainant_name  VARCHAR(100)  NOT NULL,
    complainant_cnic  VARCHAR(20)   NULL,
    complainant_phone VARCHAR(20)   NULL,
    fir_date          DATETIME2     NOT NULL,
    fir_text          NVARCHAR(MAX) NULL,
    registered_by     INT           NULL,
    CONSTRAINT fk_fir_case FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fir_station FOREIGN KEY (station_id)
        REFERENCES Police_Stations(station_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_fir_officer FOREIGN KEY (registered_by)
        REFERENCES Police_Officers(officer_id)
        ON DELETE SET NULL ON UPDATE NO ACTION
);
GO

-- ============================================================
--  TABLE 15: Court_Cases (Weak Entity)
-- ============================================================
CREATE TABLE Court_Cases (
    court_case_id    INT           PRIMARY KEY IDENTITY(1,1),
    case_id          INT           NOT NULL,
    court_name       VARCHAR(200)  NOT NULL,
    judge_name       VARCHAR(100)  NULL,
    hearing_date     DATE          NULL,
    next_hearing     DATE          NULL,
    verdict          VARCHAR(200)  NULL,
    court_status     VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    remarks          NVARCHAR(MAX) NULL,
    CONSTRAINT chk_court_status CHECK (court_status IN ('Pending','Hearing','Verdict Given','Acquitted','Convicted')),
    CONSTRAINT fk_cc_case2 FOREIGN KEY (case_id)
        REFERENCES Cases(case_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ============================================================
--  SAMPLE DATA INSERTS
--  SET IDENTITY_INSERT used where explicit IDs are needed
-- ============================================================

-- Police Stations
INSERT INTO Police_Stations (station_name, address, city, phone, in_charge) VALUES
('Gulberg Police Station',    'Main Boulevard Gulberg III, Lahore',  'Lahore', '042-35761234', 'DSP Khalid Mahmood'),
('Model Town Police Station', 'Model Town Link Road, Lahore',        'Lahore', '042-35161234', 'DSP Rashid Ahmed'),
('Cantt Police Station',      'Empress Road, Cantonment, Lahore',    'Lahore', '042-36031234', 'DSP Zafar Iqbal'),
('Faisal Town Police Station','Faisal Town Main Road, Lahore',       'Lahore', '042-35291234', 'ASI Tariq Hameed'),
('Iqbal Town Police Station', 'Iqbal Town, Ravi Road, Lahore',       'Lahore', '042-37831234', 'SI Nadia Rehman');
GO

-- Police Officers
INSERT INTO Police_Officers (station_id, full_name, badge_number, rank, cnic, phone, joining_date) VALUES
(1, 'DSP Khalid Mahmood',   'LP-001', 'DSP',       '3520112345671', '0300-1234567', '2010-03-15'),
(2, 'SI Ayesha Siddiqui',   'LP-002', 'SI',        '3520112345672', '0301-2345678', '2015-07-20'),
(3, 'DSP Rashid Ahmed',     'LP-003', 'DSP',       '3520112345673', '0302-3456789', '2009-01-10'),
(4, 'ASI Tariq Hameed',     'LP-004', 'ASI',       '3520112345674', '0303-4567890', '2018-05-25'),
(5, 'SI Nadia Rehman',      'LP-005', 'SI',        '3520112345675', '0304-5678901', '2016-11-30'),
(1, 'Inspector Javed Ali',  'LP-006', 'Inspector', '3520112345676', '0305-6789012', '2012-08-14'),
(2, 'SI Bilal Akram',       'LP-007', 'SI',        '3520112345677', '0306-7890123', '2017-02-28'),
(3, 'ASI Saima Butt',       'LP-008', 'ASI',       '3520112345678', '0307-8901234', '2019-09-05'),
(4, 'DSP Zafar Iqbal',      'LP-009', 'DSP',       '3520112345679', '0308-9012345', '2011-04-18'),
(5, 'SI Umaira Farooq',     'LP-010', 'SI',        '3520112345610', '0309-0123456', '2016-06-22');
GO

-- Crime Types
INSERT INTO Crime_Types (crime_name, description, ipc_section) VALUES
('Robbery',    'Forceful taking of property from a person', 'PPC Section 392'),
('Murder',     'Unlawful killing of a human being',         'PPC Section 302'),
('Drugs',      'Narcotics trafficking, possession or use',  'CNS Act 1997'),
('Kidnapping', 'Abduction or unlawful confinement',         'PPC Section 365'),
('Fraud',      'Deception for unlawful financial gain',     'PPC Section 420'),
('Assault',    'Physical attack causing bodily harm',       'PPC Section 337');
GO

-- Crime Severity
INSERT INTO Crime_Severity (severity_level, description, max_penalty) VALUES
('Minor',    'Low-impact offenses with minimal harm',           'Up to 1 year imprisonment'),
('Moderate', 'Medium-impact offenses with significant harm',    'Up to 7 years imprisonment'),
('Severe',   'High-impact offenses with extreme harm or death', 'Life imprisonment or death penalty');
GO

-- Locations
INSERT INTO Locations (station_id, area_name, district, province, postal_code) VALUES
(1, 'Gulberg III', 'Lahore', 'Punjab', '54660'),
(1, 'Gulberg II',  'Lahore', 'Punjab', '54660'),
(2, 'Model Town',  'Lahore', 'Punjab', '54700'),
(2, 'Johar Town',  'Lahore', 'Punjab', '54782'),
(3, 'DHA Phase 5', 'Lahore', 'Punjab', '54810'),
(3, 'Cantt Area',  'Lahore', 'Punjab', '54810'),
(4, 'Faisal Town', 'Lahore', 'Punjab', '54770'),
(4, 'Wapda Town',  'Lahore', 'Punjab', '54770'),
(5, 'Iqbal Town',  'Lahore', 'Punjab', '54570'),
(5, 'Samanabad',   'Lahore', 'Punjab', '54500');
GO

-- Criminals
INSERT INTO Criminals (full_name, cnic, date_of_birth, gender, address, phone, status) VALUES
('Tariq Mehmood',    '3740512345678', '1985-03-12', 'Male', 'House 12, Street 4, Shadbagh, Lahore',  '0321-1111111', 'Wanted'),
('Asif Raza Khan',   '3520198765432', '1978-07-25', 'Male', 'Flat 3A, Block B, Allama Iqbal Town',   '0322-2222222', 'Wanted'),
('Zubair Hussain',   '3630287654321', '1990-11-08', 'Male', 'Chowk Yateem Khana, Old City, Lahore',  '0323-3333333', 'Wanted'),
('Naveed Akhtar',    '3810376543210', '1983-05-15', 'Male', 'House 77, Block G2, Johar Town',         '0324-4444444', 'Arrested'),
('Danish Shahzad',   '3720465432109', '1992-09-30', 'Male', 'Flat 5, Green Avenue, Gulberg',          '0325-5555555', 'Wanted'),
('Imran Butt',       '3550554321098', '1980-01-20', 'Male', 'House 45, Ravi Road, Shahdara',          '0326-6666666', 'Wanted'),
('Raheel Chaudhary', '3840643210987', '1995-04-14', 'Male', 'House 9, Street 2, Model Town Ext',      '0327-7777777', 'Released'),
('Kamran Malik',     '3740732109876', '1976-12-03', 'Male', 'Flat 12, Block D, Allama Iqbal Town',    '0328-8888888', 'Wanted'),
('Shahid Pervez',    '3620821098765', '1988-08-22', 'Male', 'House 33, Samanabad Colony, Lahore',     '0329-9999999', 'Arrested'),
('Bilal Niazi',      '3710910987654', '1993-06-17', 'Male', 'House 101, DHA Phase 4, Lahore',         '0330-1010101', 'Wanted'),
('Usman Ghani',      '3530009876543', '1982-02-28', 'Male', 'Flat 7, Faisal Town Block A',            '0331-1111112', 'Released'),
('Faisal Qureshi',   '3760198765431', '1987-10-05', 'Male', 'House 55, Cavalry Ground, Lahore',      '0332-2222223', 'Wanted');
GO

-- Cases
INSERT INTO Cases (crime_type_id, severity_id, location_id, case_title, description, case_date, status) VALUES
(1, 3, 1, 'Armed Robbery at Gulberg Market',     'Gang of 3 armed robbers looted cash and jewelry from shopkeepers on Main Boulevard Gulberg.', '2025-11-02', 'Open'),
(2, 3, 5, 'Murder Case -- Defence Housing',       'Body of unidentified male found in DHA Phase 5. Multiple stab wounds. CCTV footage collected.', '2025-10-28', 'Under Investigation'),
(3, 2, 3, 'Drug Trafficking Near Canal Road',    'Large quantity of heroin seized near Model Town. Suspect fled the scene.', '2025-11-01', 'Open'),
(4, 3, 4, 'Child Kidnapping -- Johar Town',      'Minor child abducted from school premises. Ransom demand received. Child recovered safely.', '2025-10-15', 'Closed'),
(5, 2, 1, 'Bank Fraud -- MCB Gulberg Branch',    'Fraudulent online transactions worth PKR 2.8M detected. Account holder complaint filed.', '2025-10-30', 'Under Investigation'),
(1, 1, 6, 'Street Robbery -- Liberty Market',    'Motorcycle snatching incident near Liberty Market. Two suspects fled on foot.', '2025-11-03', 'Open'),
(6, 1, 3, 'Assault -- Model Town Park Incident', 'Physical altercation in Model Town park. Victim sustained minor injuries. Complaint registered.', '2025-09-20', 'Closed'),
(2, 3, 9, 'Double Murder -- Iqbal Town',         'Two males found shot dead inside a house. Crime scene sealed. Investigation ongoing.', '2025-11-04', 'Open'),
(3, 2,10, 'Narcotics Seizure -- Data Darbar Area','Police intercepted drug consignment near Data Darbar. 5 kg charas recovered.', '2025-09-10', 'Closed'),
(5, 1, 7, 'Business Fraud -- Faisal Town',       'Property dealer accused of selling same plot to multiple buyers. PKR 1.2M scam.', '2025-10-25', 'Open'),
(1, 2, 6, 'Robbery -- Cantt Commercial Area',    'Cash snatched from ATM user near Cantt area. Suspect on CCTV wearing helmet.', '2025-10-18', 'Under Investigation'),
(4, 3, 6, 'Kidnapping for Ransom -- Lahore City','Businessman abducted from Cantt area. Family received ransom call of PKR 5M.', '2025-11-05', 'Open'),
(1, 1, 8, 'Mobile Snatching Gang -- Wapda Town', 'Gang of 4 youth snatching mobiles. 3 victims filed complaint. Gang partially identified.', '2025-08-30', 'Closed'),
(3, 3,10, 'Drug Peddling Network -- Samanabad',  'Major drug distribution network busted. 15 kg ice/meth seized from warehouse.', '2025-10-22', 'Under Investigation'),
(6, 3, 6, 'Attempted Murder -- Beadon Road',     'Victim shot twice outside his shop. Condition critical. Shooter fled on motorcycle.', '2025-11-01', 'Open');
GO

-- Criminal_Case (M:N junction)
INSERT INTO Criminal_Case (criminal_id, case_id, role) VALUES
(1, 1,  'Primary Suspect'), (1, 6,  'Primary Suspect'), (1, 13, 'Accomplice'),
(2, 2,  'Primary Suspect'), (2, 8,  'Primary Suspect'),
(3, 3,  'Primary Suspect'), (3, 9,  'Primary Suspect'), (3, 14, 'Gang Leader'),
(4, 4,  'Primary Suspect'),
(5, 5,  'Primary Suspect'),
(6, 6,  'Accomplice'),      (6, 11, 'Primary Suspect'),
(7, 7,  'Primary Suspect'),
(8, 8,  'Accomplice'),      (8, 15, 'Primary Suspect'),
(9, 9,  'Accomplice'),
(10,12, 'Primary Suspect'),
(11,10, 'Primary Suspect'),
(12,11, 'Primary Suspect'), (12, 1, 'Accomplice');
GO

-- Case_Officers (M:N junction)
INSERT INTO Case_Officers (case_id, officer_id, assigned_date, role) VALUES
(1,  1, '2025-11-02', 'Investigating Officer'), (1,  6, '2025-11-02', 'Support Officer'),
(2,  3, '2025-10-28', 'Investigating Officer'), (2,  8, '2025-10-28', 'Scene Officer'),
(3,  2, '2025-11-01', 'Investigating Officer'), (3,  7, '2025-11-01', 'Support Officer'),
(4,  5, '2025-10-15', 'Investigating Officer'),
(5,  1, '2025-10-30', 'Investigating Officer'), (5,  6, '2025-10-30', 'Support Officer'),
(6,  9, '2025-11-03', 'Investigating Officer'),
(7,  2, '2025-09-20', 'Investigating Officer'),
(8,  3, '2025-11-04', 'Investigating Officer'), (8,  8, '2025-11-04', 'Scene Officer'),
(9,  5, '2025-09-10', 'Investigating Officer'),
(10, 4, '2025-10-25', 'Investigating Officer'),
(11, 9, '2025-10-18', 'Investigating Officer'),
(12, 1, '2025-11-05', 'Investigating Officer'), (12, 6, '2025-11-05', 'Support Officer'),
(13, 4, '2025-08-30', 'Investigating Officer'),
(14, 5, '2025-10-22', 'Investigating Officer'), (14,10, '2025-10-22', 'Support Officer'),
(15, 3, '2025-11-01', 'Investigating Officer'), (15, 8, '2025-11-01', 'Scene Officer');
GO

-- Evidence
INSERT INTO Evidence (case_id, evidence_type, description, collected_by, collection_date, storage_location) VALUES
(1,  'CCTV Footage', 'Mall Road camera footage 11:30PM Nov 2',          1,    '2025-11-03', 'Digital Evidence Room - Gulberg'),
(1,  'Weapon',       'Pistol recovered near crime scene',               6,    '2025-11-03', 'Evidence Room Locker #12'),
(2,  'DNA Sample',   'Blood samples from crime scene',                  3,    '2025-10-29', 'Forensic Lab Lahore'),
(2,  'CCTV Footage', 'DHA Surveillance Camera recording',               8,    '2025-10-29', 'Digital Evidence Room - Cantt'),
(3,  'Narcotics',    '2.5 kg heroin in sealed bags',                    2,    '2025-11-01', 'Narcotics Evidence Room'),
(4,  'Phone Record', 'Call logs of ransom communication',               5,    '2025-10-16', 'Digital Evidence - Iqbal Town'),
(5,  'Bank Records', 'Transaction logs from MCB server',                NULL, '2025-10-31', 'Digital Evidence Room - Gulberg'),
(8,  'Firearm',      '9mm pistol with 3 rounds, fingerprints lifted',   3,    '2025-11-05', 'Evidence Room Locker #23'),
(14, 'Narcotics',    '15 kg crystalline methamphetamine',               5,    '2025-10-23', 'Narcotics Evidence Room'),
(14, 'CCTV Footage', 'Warehouse entry/exit recording 3 days',           10,   '2025-10-23', 'Digital Evidence Room - Iqbal Town'),
(15, 'CCTV Footage', 'Shopfront camera capturing shooter motorcycle',   3,    '2025-11-02', 'Digital Evidence Room - Cantt');
GO

-- Arrest Records
INSERT INTO Arrest_Records (criminal_id, case_id, officer_id, arrest_date, arrest_location, charges, bail_status) VALUES
(4,  4,  5, '2025-10-17 14:30:00', 'Johar Town, Lahore',  'Kidnapping, Criminal Confinement (PPC 365)', 'No Bail'),
(7,  7,  2, '2025-09-22 10:15:00', 'Model Town, Lahore',  'Assault (PPC 337)',                          'Bail Granted'),
(9,  9,  5, '2025-09-12 18:45:00', 'Data Darbar, Lahore', 'Narcotics Possession (CNS Act 1997 S.9)',    'No Bail'),
(11,10,  4, '2025-10-27 11:00:00', 'Faisal Town, Lahore', 'Fraud (PPC 420), Cheating',                  'Bail Granted');
GO

-- Witnesses  (MySQL FALSE/TRUE -> 0/1)
INSERT INTO Witnesses (case_id, full_name, cnic, phone, statement, statement_date, is_protected) VALUES
(1,  'Mohammad Aslam', '3520211111111', '0321-5555555', 'I saw three men with guns enter the market around 11 PM.',    '2025-11-03', 0),
(2,  'Zainab Khalid',  '3520222222222', '0322-6666666', 'Heard loud noises and saw a car speeding away around 2 AM.', '2025-10-29', 1),
(4,  'Rashida Bibi',   '3520233333333', '0323-7777777', 'Saw a white car following the school van in the morning.',   '2025-10-16', 1),
(8,  'Tariq Saleem',   '3520244444444', '0324-8888888', 'Two men forced entry into the house with weapons.',          '2025-11-05', 1),
(12, 'Amjad Hussain',  '3520255555555', '0325-9999999', 'Witnessed abduction near Cantonment railway station.',       '2025-11-06', 1);
GO

-- Victims
INSERT INTO Victims (case_id, full_name, cnic, date_of_birth, gender, phone, address, injury_detail) VALUES
(1,  'Raza Shah Jewelers', NULL,            NULL,         'Male', '0321-3333333', 'Shop 14, Gulberg Market',        'No physical injury. Cash and jewelry stolen PKR 450,000.'),
(2,  'Unidentified Male',  NULL,            '1975-01-01', 'Male', NULL,           'Unknown',                        'Multiple stab wounds. Death confirmed at scene.'),
(4,  'Ali Hassan (Minor)', NULL,            '2016-05-10', 'Male', NULL,           'House 30, Johar Town Block A',   'No physical injury. Psychological trauma. Recovered safely.'),
(7,  'Waseem Akbar',       '3520266666666', '1990-03-15', 'Male', '0326-1111111', 'Street 5, Model Town Extension','Minor bruising on face and arms.'),
(8,  'Amir Sohail',        '3520277777777', '1982-07-28', 'Male', '0327-2222222', 'House 14, Iqbal Town Block C',  'Two gunshot wounds. Deceased.'),
(8,  'Raza Sohail',        '3520288888888', '1985-09-14', 'Male', '0328-3333333', 'House 14, Iqbal Town Block C',  'One gunshot wound. Deceased.'),
(15, 'Nadeem Butt',        '3520299999999', '1979-11-22', 'Male', '0329-4444444', 'Shop 3, Beadon Road',           'Two gunshot wounds. Critical condition. Hospitalized.');
GO

-- FIR Complaints
INSERT INTO FIR_Complaints (case_id, station_id, complainant_name, complainant_cnic, complainant_phone, fir_date, fir_text, registered_by) VALUES
(1,  1, 'Raza Shah',     '3520301111111', '0321-3333333', '2025-11-02 23:45:00', 'Armed robbers entered the market and looted shops at gunpoint.',      1),
(2,  3, 'Amjad Saleem',  '3520302222222', '0322-4444444', '2025-10-28 06:30:00', 'Found dead body of unknown male during morning walk in DHA.',          3),
(3,  2, 'Area Resident', '3520303333333', '0323-5555555', '2025-11-01 21:15:00', 'Suspicious vehicle and activity near Canal Road. Drugs suspected.',    2),
(4,  5, 'Rehana Hassan', '3520304444444', '0324-6666666', '2025-10-15 14:00:00', 'My son Ali Hassan was kidnapped from school. Ransom demand received.', 5),
(5,  1, 'Irfan Ahmed',   '3520305555555', '0325-7777777', '2025-10-30 10:30:00', 'Fraudulent transactions from my MCB account totaling PKR 2.8M.',       6),
(6,  3, 'Salim Akhtar',  '3520306666666', '0326-8888888', '2025-11-03 20:00:00', 'Motorcycle snatched near Liberty Market by two men.',                  9),
(8,  5, 'Khalid Sohail', '3520307777777', '0327-9999999', '2025-11-04 09:00:00', 'Found my brothers shot dead inside our house in Iqbal Town.',          5),
(12, 3, 'Hamid Nisar',   '3520308888888', '0328-1111111', '2025-11-05 19:30:00', 'My employer was forcibly taken into a car near Cantt station.',         9),
(15, 3, 'Saira Butt',    '3520309999999', '0329-2222222', '2025-11-01 16:45:00', 'My husband was shot outside his shop on Beadon Road.',                 3);
GO

-- Court Cases
INSERT INTO Court_Cases (case_id, court_name, judge_name, hearing_date, next_hearing, verdict, court_status, remarks) VALUES
(4,  'Sessions Court Lahore, Court No. 3', 'Justice Arshad Malik',    '2025-11-01', '2025-11-20', NULL,                'Hearing',   'Bail rejected. Next hearing for witness statements.'),
(7,  'Judicial Magistrate Court, Lahore',  'Magistrate Farrukh Baig', '2025-10-15', NULL,          'Acquitted',         'Acquitted', 'Insufficient evidence. Accused released.'),
(9,  'Anti-Narcotics Court Lahore',        'Justice Qaiser Abbasi',   '2025-10-01', '2025-11-25', NULL,                'Hearing',   'Trial in progress. Drug quantity confirmed by forensics.'),
(13, 'Judicial Magistrate Court, Lahore',  'Magistrate Naeem Shah',   '2025-10-10', NULL,          'Convicted 2 years', 'Convicted', 'Two of three accused convicted. Third acquitted.');
GO

-- ============================================================
--  VIEWS
-- ============================================================

-- Most Wanted
CREATE OR ALTER VIEW vw_most_wanted AS
SELECT
    cr.criminal_id,
    cr.full_name,
    cr.cnic,
    cr.status,
    COUNT(cc.case_id) AS total_cases
FROM Criminals cr
LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
WHERE cr.status = 'Wanted'
GROUP BY cr.criminal_id, cr.full_name, cr.cnic, cr.status;
GO

-- Monthly Stats  (MONTHNAME does not exist in T-SQL; use DATENAME instead)
CREATE OR ALTER VIEW vw_monthly_stats AS
SELECT
    YEAR(c.case_date)              AS year,
    MONTH(c.case_date)             AS month,
    DATENAME(MONTH, c.case_date)   AS month_name,
    COUNT(*)                       AS cases_filed
FROM Cases c
GROUP BY YEAR(c.case_date), MONTH(c.case_date), DATENAME(MONTH, c.case_date);
GO

-- Case Status Summary
CREATE OR ALTER VIEW vw_case_status_summary AS
SELECT status, COUNT(*) AS total
FROM Cases
GROUP BY status;
GO

-- Officer Performance
CREATE OR ALTER VIEW vw_officer_performance AS
SELECT
    po.officer_id,
    po.full_name,
    po.badge_number,
    po.rank,
    ps.station_name,
    COUNT(DISTINCT co.case_id)   AS cases_handled,
    COUNT(DISTINCT ar.arrest_id) AS arrests_made
FROM Police_Officers po
LEFT JOIN Police_Stations  ps ON po.station_id  = ps.station_id
LEFT JOIN Case_Officers    co ON po.officer_id  = co.officer_id
LEFT JOIN Arrest_Records   ar ON po.officer_id  = ar.officer_id
GROUP BY po.officer_id, po.full_name, po.badge_number, po.rank, ps.station_name;
GO

-- ============================================================
--  STORED PROCEDURES
--  MySQL syntax replaced with T-SQL:
--    IN  param  ->  @param  (no IN keyword)
--    ROW_COUNT() -> @@ROWCOUNT
--    Multiple result sets in one procedure are supported natively
-- ============================================================

CREATE OR ALTER PROCEDURE sp_search_by_cnic
    @p_cnic VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT cr.*, COUNT(cc.case_id) AS total_cases
    FROM Criminals cr
    LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
    WHERE cr.cnic = @p_cnic
    GROUP BY
        cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth,
        cr.gender, cr.address, cr.phone, cr.status,
        cr.photo_url, cr.created_at, cr.updated_at;
END;
GO

CREATE OR ALTER PROCEDURE sp_update_case_status
    @p_case_id INT,
    @p_status  VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Cases SET status = @p_status WHERE case_id = @p_case_id;
    SELECT @@ROWCOUNT AS rows_affected;
END;
GO

CREATE OR ALTER PROCEDURE sp_get_case_full_detail
    @p_case_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: case details
    SELECT c.*, ct.crime_name, cs.severity_level, l.area_name, l.district
    FROM Cases c
    JOIN Crime_Types    ct ON c.crime_type_id = ct.crime_type_id
    JOIN Crime_Severity cs ON c.severity_id   = cs.severity_id
    JOIN Locations       l ON c.location_id   = l.location_id
    WHERE c.case_id = @p_case_id;

    -- Result set 2: criminals linked to this case
    SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.status, cc.role
    FROM Criminal_Case cc
    JOIN Criminals cr ON cc.criminal_id = cr.criminal_id
    WHERE cc.case_id = @p_case_id;

    -- Result set 3: officers assigned to this case
    SELECT po.full_name, po.badge_number, po.rank, co.role
    FROM Case_Officers co
    JOIN Police_Officers po ON co.officer_id = po.officer_id
    WHERE co.case_id = @p_case_id;
END;
GO

-- ============================================================
--  FINAL VERIFICATION QUERY
--  Uncomment and run after all inserts to check row counts
-- ============================================================
-- SELECT 'Police_Stations' AS tbl, COUNT(*) AS rows FROM Police_Stations
-- UNION ALL SELECT 'Police_Officers', COUNT(*) FROM Police_Officers
-- UNION ALL SELECT 'Crime_Types',     COUNT(*) FROM Crime_Types
-- UNION ALL SELECT 'Crime_Severity',  COUNT(*) FROM Crime_Severity
-- UNION ALL SELECT 'Locations',       COUNT(*) FROM Locations
-- UNION ALL SELECT 'Criminals',       COUNT(*) FROM Criminals
-- UNION ALL SELECT 'Cases',           COUNT(*) FROM Cases
-- UNION ALL SELECT 'Criminal_Case',   COUNT(*) FROM Criminal_Case
-- UNION ALL SELECT 'Case_Officers',   COUNT(*) FROM Case_Officers
-- UNION ALL SELECT 'Evidence',        COUNT(*) FROM Evidence
-- UNION ALL SELECT 'Arrest_Records',  COUNT(*) FROM Arrest_Records
-- UNION ALL SELECT 'Witnesses',       COUNT(*) FROM Witnesses
-- UNION ALL SELECT 'Victims',         COUNT(*) FROM Victims
-- UNION ALL SELECT 'FIR_Complaints',  COUNT(*) FROM FIR_Complaints
-- UNION ALL SELECT 'Court_Cases',     COUNT(*) FROM Court_Cases;
