const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/misc";
    if (file.fieldname === "resume") uploadPath = "uploads/resumes";
    else if (file.fieldname === "photo" || file.fieldname === "logo") uploadPath = "uploads/images";
    else if (file.fieldname === "import") uploadPath = "uploads/imports";
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`), false);
  }
};

const uploadResume = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter([".pdf", ".doc", ".docx"]),
}).single("resume");

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter([".jpg", ".jpeg", ".png", ".webp"]),
}).single("photo");

const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter([".jpg", ".jpeg", ".png", ".webp", ".svg"]),
}).single("logo");

const uploadImport = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter([".xlsx", ".xls", ".csv"]),
}).single("import");

const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadResume: handleUploadError(uploadResume),
  uploadPhoto: handleUploadError(uploadPhoto),
  uploadLogo: handleUploadError(uploadLogo),
  uploadImport: handleUploadError(uploadImport),
};
