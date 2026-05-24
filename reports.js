const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../config/db');

// GET monthly crime statistics
router.get('/monthly', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT YEAR(case_date)                  AS year,
                   MONTH(case_date)                 AS month,
                   DATENAME(MONTH, case_date)        AS month_name,
                   COUNT(*)                          AS cases_filed
            FROM Cases
            GROUP BY YEAR(case_date), MONTH(case_date), DATENAME(MONTH, case_date)
            ORDER BY year, month`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET officer performance
router.get('/officers', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT po.officer_id, po.full_name, po.badge_number, po.rank,
                   ps.station_name,
                   COUNT(DISTINCT co.case_id)   AS cases_handled,
                   COUNT(DISTINCT ar.arrest_id) AS arrests_made
            FROM Police_Officers po
            LEFT JOIN Police_Stations ps ON po.station_id = ps.station_id
            LEFT JOIN Case_Officers co   ON po.officer_id = co.officer_id
            LEFT JOIN Arrest_Records ar  ON po.officer_id = ar.officer_id
            GROUP BY po.officer_id, po.full_name, po.badge_number, po.rank, ps.station_name
            ORDER BY cases_handled DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET crime type breakdown
router.get('/crime-types', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ct.crime_type_id, ct.crime_name, COUNT(c.case_id) AS total_cases
            FROM Crime_Types ct
            LEFT JOIN Cases c ON ct.crime_type_id = c.crime_type_id
            GROUP BY ct.crime_type_id, ct.crime_name
            ORDER BY total_cases DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET dashboard summary
router.get('/dashboard', async (req, res) => {
    try {
        const pool = await poolPromise;

        const r = async (q) => (await pool.request().query(q)).recordset[0];

        const total_criminals = (await r('SELECT COUNT(*) AS v FROM Criminals')).v;
        const wanted          = (await r("SELECT COUNT(*) AS v FROM Criminals WHERE status='Wanted'")).v;
        const open_cases      = (await r("SELECT COUNT(*) AS v FROM Cases WHERE status='Open'")).v;
        const closed_cases    = (await r("SELECT COUNT(*) AS v FROM Cases WHERE status='Closed'")).v;
        const total_cases     = (await r('SELECT COUNT(*) AS v FROM Cases')).v;
        const total_officers  = (await r('SELECT COUNT(*) AS v FROM Police_Officers')).v;
        const under_inv       = (await r("SELECT COUNT(*) AS v FROM Cases WHERE status='Under Investigation'")).v;

        res.json({ success: true, data: { total_criminals, wanted, open_cases, closed_cases, total_cases, total_officers, under_inv } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;