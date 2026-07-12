const dashboardService = require('./backend/services/dashboardService');
const db = require('./backend/config/db');
async function t() {
    try {
        await db.execute('insert into websites', [1, 'My app', 'myapp.com', 'static']);
        await db.execute('update websites set name = ?, status = ? where id = ? and user_id = ?', ['My app', 'running', 1, 1]);
        console.log(await dashboardService.getDashboardSummaryData({ id: 1, email: 'test@test.com' }));
    } catch (e) {
        console.error(e);
    }
}
t();
