const sql = require('mssql');

const config = {
    server: 'ELITEBOOK\\SQLEXPRESS',
    database: 'crms_db',
    user: 'sa',
    password: 'fbise9016687',

    options: {
        encrypt: false,
        trustServerCertificate: true
    },

    authentication: {
        type: 'default'
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Connected to SQL Server (crms_db)');
        return pool;
    })
    .catch(err => {
        console.error('❌ DB Connection Failed:', err.message);
        process.exit(1);
    });

module.exports = { sql, poolPromise };