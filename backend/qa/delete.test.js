const { apiRequest } = require('./utils');

async function run(state) {
    const token = state.token;
    if (!token) throw new Error("No auth token available");

    const toDelete = [];
    if (state.staticWebsiteId) toDelete.push(state.staticWebsiteId);
    if (state.nodeWebsiteId) toDelete.push(state.nodeWebsiteId);

    for (const id of toDelete) {
        // 1. Delete Website
        const deleteRes = await apiRequest(`websites/${id}`, 'DELETE', null, token);
        if (!deleteRes.success) throw new Error(`Failed to delete website ${id}`);

        // 2. Verify deletion via DB check (GET /websites)
        const getRes = await apiRequest(`websites`, 'GET', null, token);
        const exists = getRes.data.some(w => w.id === id);
        if (exists) {
            throw new Error(`Website ${id} still exists in database after deletion`);
        }
    }

    return state;
}

module.exports = { run, name: "Delete" };
