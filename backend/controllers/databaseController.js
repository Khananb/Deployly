const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const databaseService = require("../services/databaseService");
const { sendSuccess } = require("../utils/apiResponse");

const databaseSchema = Joi.object({
    db_name: Joi.string().alphanum().min(3).max(64).required(),
    db_user: Joi.string().alphanum().min(3).max(32).required()
});

const createDatabase = asyncHandler(async (req, res) => {
    const { error, value } = databaseSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.statusCode = 400;
        throw err;
    }

    const { db_name, db_user } = value;
    // Prefix DB names with user ID in a real system to prevent collisions, 
    // but for logical MVP we just store the requested name.
    const dbRecord = await databaseService.createDatabaseRecord(req.user.id, db_name, db_user);
    
    sendSuccess(res, dbRecord, "Database record created successfully", 201);
});

const getDatabases = asyncHandler(async (req, res) => {
    const databases = await databaseService.getDatabases(req.user.id);
    sendSuccess(res, { databases }, "Databases fetched successfully");
});

const deleteDatabase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await databaseService.deleteDatabaseRecord(req.user.id, id);
    sendSuccess(res, {}, "Database deleted successfully");
});

module.exports = {
    createDatabase,
    getDatabases,
    deleteDatabase
};
