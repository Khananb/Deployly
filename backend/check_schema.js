const mysql = require('mysql2/promise');
(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'deployly', password: 'Deployly@123', database: 'deployly' });
        const [rows] = await pool.query("SHOW CREATE TABLE domains");
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
