const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const websiteId = parseInt(req.params.id, 10);
        const userId = parseInt(req.user.id, 10);
        
        if (isNaN(websiteId) || isNaN(userId)) {
            return cb(new Error("Invalid ID for upload path"));
        }
        
        const uploadPath = path.join(__dirname, "../../storage/uploads", String(userId), String(websiteId));
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `deploy-${Date.now()}.zip`);
    }
});

const fileFilter = (req, file, cb) => {
    // Validate ZIP
    if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed") {
        cb(null, true);
    } else {
        cb(new Error("Only ZIP files are allowed"), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
