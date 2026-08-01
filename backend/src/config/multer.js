const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) return cb(new Error('Only .csv files are accepted'));
    cb(null, true);
  }
});

module.exports = upload;
