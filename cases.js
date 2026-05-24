const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../config/db');

// GET all cases
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT c.case_id, c.case_title, c.case_date, c.status, c.description,
                   c.crime_type_id, c.severity_id, c.location_id,
                   ct.crime_name, cs.severity_level, l.area_name, l.district
            FROM Cases c
            JOIN Crime_Types ct    ON c.crime_type_id = ct.crime_type_id
            JOIN Crime_Severity cs ON c.severity_id   = cs.severity_id
            JOIN Locations l       ON c.location_id   = l.location_id`;

        if (req.query.status) {
            request.input('status', sql.VarChar, req.query.status);
            query += ' WHERE c.status = @status';
        }
        query += ' ORDER BY c.case_id DESC';

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET status summary — must be before /:id
router.get('/summary/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT status, COUNT(*) AS total FROM Cases GROUP BY status');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single case with all related data
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;

        const caseResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT c.*, ct.crime_name, cs.severity_level, l.area_name, l.district
                FROM Cases c
                JOIN Crime_Types ct    ON c.crime_type_id = ct.crime_type_id
                JOIN Crime_Severity cs ON c.severity_id   = cs.severity_id
                JOIN Locations l       ON c.location_id   = l.location_id
                WHERE c.case_id = @id`);

        const caseRow = caseResult.recordset[0];
        if (!caseRow)
            return res.status(404).json({ success: false, message: 'Case not found' });

        const criminals = (await pool.request().input('id', sql.Int, req.params.id)
            .query(`SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.status, cc.role
                    FROM Criminal_Case cc
                    JOIN Criminals cr ON cc.criminal_id = cr.criminal_id
                    WHERE cc.case_id = @id`)).recordset;

        const officers = (await pool.request().input('id', sql.Int, req.params.id)
            .query(`SELECT po.full_name, po.badge_number, po.rank, co.role, co.assigned_date
                    FROM Case_Officers co
                    JOIN Police_Officers po ON co.officer_id = po.officer_id
                    WHERE co.case_id = @id`)).recordset;

        const evidence = (await pool.request().input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Evidence WHERE case_id = @id')).recordset;

        const witnesses = (await pool.request().input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Witnesses WHERE case_id = @id')).recordset;

        const victims = (await pool.request().input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Victims WHERE case_id = @id')).recordset;

        const firs = (await pool.request().input('id', sql.Int, req.params.id)
            .query(`SELECT f.*, ps.station_name
                    FROM FIR_Complaints f
                    JOIN Police_Stations ps ON f.station_id = ps.station_id
                    WHERE f.case_id = @id`)).recordset;

        const court = (await pool.request().input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Court_Cases WHERE case_id = @id')).recordset;

        res.json({ success: true, data: { caseRow, criminals, officers, evidence, witnesses, victims, firs, court } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST file new case
router.post('/', async (req, res) => {
    const { crime_type_id, severity_id, location_id, case_title, description, case_date, status } = req.body;
    if (!crime_type_id || !severity_id || !location_id || !case_title || !case_date)
        return res.status(400).json({ success: false, message: 'Required: crime_type_id, severity_id, location_id, case_title, case_date' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('crime_type_id', sql.Int,      crime_type_id)
            .input('severity_id',   sql.Int,      severity_id)
            .input('location_id',   sql.Int,      location_id)
            .input('case_title',    sql.VarChar,  case_title)
            .input('description',   sql.NVarChar, description || null)
            .input('case_date',     sql.Date,     case_date)
            .input('status',        sql.VarChar,  status || 'Open')
            .query(`
                INSERT INTO Cases
                    (crime_type_id, severity_id, location_id, case_title, description, case_date, status)
                VALUES
                    (@crime_type_id, @severity_id, @location_id, @case_title, @description, @case_date, @status);
                SELECT SCOPE_IDENTITY() AS case_id;
            `);

        const newId = result.recordset[0] ? result.recordset[0].case_id : null;
        res.status(201).json({ success: true, message: 'Case filed successfully', case_id: newId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT full update case
router.put('/:id', async (req, res) => {
    const { crime_type_id, severity_id, location_id, case_title, description, case_date, status } = req.body;
    if (!case_title)
        return res.status(400).json({ success: false, message: 'case_title is required' });
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('crime_type_id', sql.Int,     crime_type_id)
            .input('severity_id',   sql.Int,     severity_id)
            .input('location_id',   sql.Int,     location_id)
            .input('case_title',    sql.VarChar, case_title)
            .input('description',   sql.NVarChar,description || null)
            .input('case_date',     sql.Date,    case_date)
            .input('status',        sql.VarChar, status)
            .input('id',            sql.Int,     req.params.id)
            .query(`
                UPDATE Cases
                SET crime_type_id=@crime_type_id, severity_id=@severity_id,
                    location_id=@location_id, case_title=@case_title,
                    description=@description, case_date=@case_date, status=@status
                WHERE case_id=@id`);
        res.json({ success: true, message: 'Case updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update case status only
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    const allowed = ['Open', 'Under Investigation', 'Closed'];
    if (!allowed.includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status' });
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('status', sql.VarChar, status)
            .input('id',     sql.Int,     req.params.id)
            .query('UPDATE Cases SET status = @status WHERE case_id = @id');
        res.json({ success: true, message: `Case status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE case
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const check = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT case_title FROM Cases WHERE case_id = @id');
        if (!check.recordset[0])
            return res.status(404).json({ success: false, message: 'Case not found' });
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Cases WHERE case_id = @id');
        res.json({ success: true, message: `Case "${check.recordset[0].case_title}" deleted` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;