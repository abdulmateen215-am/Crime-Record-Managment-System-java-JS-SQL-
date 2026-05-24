const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../config/db');

// GET all criminals
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                   cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at,
                   COUNT(cc.case_id) AS total_cases
            FROM Criminals cr
            LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
            GROUP BY cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                     cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at
            ORDER BY cr.criminal_id DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET search by CNIC
router.get('/cnic/:cnic', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('cnic', sql.VarChar, req.params.cnic)
            .query(`
                SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                       cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at,
                       COUNT(cc.case_id) AS total_cases
                FROM Criminals cr
                LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
                WHERE cr.cnic = @cnic
                GROUP BY cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                         cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at`);
        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'No criminal found with this CNIC' });
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET search by name
router.get('/search/:name', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, `%${req.params.name}%`)
            .query(`
                SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                       cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at,
                       COUNT(cc.case_id) AS total_cases
                FROM Criminals cr
                LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
                WHERE cr.full_name LIKE @name
                GROUP BY cr.criminal_id, cr.full_name, cr.cnic, cr.date_of_birth, cr.gender,
                         cr.address, cr.phone, cr.status, cr.photo_url, cr.created_at, cr.updated_at`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET most wanted
router.get('/wanted', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT cr.criminal_id, cr.full_name, cr.cnic, cr.status,
                   cr.date_of_birth, cr.address, cr.phone,
                   COUNT(cc.case_id) AS total_cases
            FROM Criminals cr
            LEFT JOIN Criminal_Case cc ON cr.criminal_id = cc.criminal_id
            WHERE cr.status = 'Wanted'
            GROUP BY cr.criminal_id, cr.full_name, cr.cnic, cr.status,
                     cr.date_of_birth, cr.address, cr.phone
            ORDER BY total_cases DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single criminal + all related data
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;

        const crimResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Criminals WHERE criminal_id = @id');
        const criminal = crimResult.recordset[0];
        if (!criminal)
            return res.status(404).json({ success: false, message: 'Criminal not found' });

        const cases = (await pool.request().input('id', sql.Int, req.params.id)
            .query(`
                SELECT c.case_id, c.case_title, c.case_date, c.status, c.description,
                       ct.crime_name, cs.severity_level, l.area_name, cc.role
                FROM Criminal_Case cc
                JOIN Cases c           ON cc.case_id      = c.case_id
                JOIN Crime_Types ct    ON c.crime_type_id = ct.crime_type_id
                JOIN Crime_Severity cs ON c.severity_id   = cs.severity_id
                JOIN Locations l       ON c.location_id   = l.location_id
                WHERE cc.criminal_id = @id`)).recordset;

        const arrests = (await pool.request().input('id', sql.Int, req.params.id)
            .query(`
                SELECT ar.arrest_id, ar.arrest_date, ar.arrest_location,
                       ar.charges, ar.bail_status,
                       po.full_name AS officer_name, po.badge_number
                FROM Arrest_Records ar
                JOIN Police_Officers po ON ar.officer_id = po.officer_id
                WHERE ar.criminal_id = @id`)).recordset;

        res.json({ success: true, data: { criminal, cases, arrests } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST add new criminal
router.post('/', async (req, res) => {
    const { full_name, cnic, date_of_birth, gender, address, phone, status } = req.body;
    if (!full_name || !cnic)
        return res.status(400).json({ success: false, message: 'full_name and cnic are required' });
    try {
        const pool = await poolPromise;

        const exist = await pool.request()
            .input('cnic', sql.VarChar, cnic)
            .query('SELECT criminal_id FROM Criminals WHERE cnic = @cnic');
        if (exist.recordset.length)
            return res.status(409).json({ success: false, message: 'CNIC already exists — duplicate rejected' });

        const result = await pool.request()
            .input('full_name',     sql.VarChar, full_name)
            .input('cnic',          sql.VarChar, cnic)
            .input('date_of_birth', sql.Date,    date_of_birth || null)
            .input('gender',        sql.VarChar, gender || 'Male')
            .input('address',       sql.VarChar, address || null)
            .input('phone',         sql.VarChar, phone || null)
            .input('status',        sql.VarChar, status || 'Wanted')
            .query(`
                INSERT INTO Criminals
                    (full_name, cnic, date_of_birth, gender, address, phone, status)
                VALUES
                    (@full_name, @cnic, @date_of_birth, @gender, @address, @phone, @status);
                SELECT SCOPE_IDENTITY() AS criminal_id;
            `);

        const newId = result.recordset[0] ? result.recordset[0].criminal_id : null;
        res.status(201).json({ success: true, message: 'Criminal registered', criminal_id: newId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT full update criminal
router.put('/:id', async (req, res) => {
    const { full_name, cnic, date_of_birth, gender, address, phone, status } = req.body;
    if (!full_name || !cnic)
        return res.status(400).json({ success: false, message: 'full_name and cnic are required' });
    try {
        const pool = await poolPromise;

        const exist = await pool.request()
            .input('cnic', sql.VarChar, cnic)
            .input('id',   sql.Int,     req.params.id)
            .query('SELECT criminal_id FROM Criminals WHERE cnic = @cnic AND criminal_id != @id');
        if (exist.recordset.length)
            return res.status(409).json({ success: false, message: 'CNIC already used by another criminal' });

        await pool.request()
            .input('full_name',     sql.VarChar, full_name)
            .input('cnic',          sql.VarChar, cnic)
            .input('date_of_birth', sql.Date,    date_of_birth || null)
            .input('gender',        sql.VarChar, gender || 'Male')
            .input('address',       sql.VarChar, address || null)
            .input('phone',         sql.VarChar, phone || null)
            .input('status',        sql.VarChar, status || 'Wanted')
            .input('id',            sql.Int,     req.params.id)
            .query(`
                UPDATE Criminals
                SET full_name=@full_name, cnic=@cnic, date_of_birth=@date_of_birth,
                    gender=@gender, address=@address, phone=@phone, status=@status
                WHERE criminal_id=@id`);
        res.json({ success: true, message: 'Criminal record updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update status only
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    const allowed = ['Wanted', 'Arrested', 'Released'];
    if (!allowed.includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('status', sql.VarChar, status)
            .input('id',     sql.Int,     req.params.id)
            .query('UPDATE Criminals SET status = @status WHERE criminal_id = @id');
        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE criminal
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const check = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT full_name FROM Criminals WHERE criminal_id = @id');
        if (!check.recordset[0])
            return res.status(404).json({ success: false, message: 'Criminal not found' });
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Criminals WHERE criminal_id = @id');
        res.json({ success: true, message: `Criminal "${check.recordset[0].full_name}" deleted` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;