const asyncHandler = require("../utils/asyncHandler");
const profileService = require("../services/profileService");
const { sendSuccess } = require("../utils/apiResponse");

const getProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.getUserProfileData(req.user.id);
    sendSuccess(res, { profile }, "Profile fetched successfully");
});

module.exports = {
    getProfile
};
