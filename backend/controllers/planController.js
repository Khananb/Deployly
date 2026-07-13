const asyncHandler = require("../utils/asyncHandler");
const Plan = require("../models/Plan");
const { sendSuccess } = require("../utils/apiResponse");

const getFounderStock = asyncHandler(async (req, res) => {
    const founderPlan = await Plan.getFounderPlan();
    if (!founderPlan) {
        const error = new Error("Founder Edition plan not found.");
        error.statusCode = 404;
        throw error;
    }

    sendSuccess(res, {
        price: founderPlan.price,
        status: founderPlan.status,
        slots_used: founderPlan.used_slots,
        slots_remaining: Math.max(0, founderPlan.max_slots - founderPlan.used_slots)
    }, "Founder stock retrieved successfully");
});

module.exports = {
    getFounderStock
};
