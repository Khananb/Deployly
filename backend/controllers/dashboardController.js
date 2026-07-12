const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboardService");
const { sendSuccess } = require("../utils/apiResponse");

const getDashboardSummary = asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboardSummaryData(req.user);
    sendSuccess(res, data, "Welcome to Deployly Dashboard");
});

module.exports = { getDashboardSummary };
