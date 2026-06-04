const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history-controller');
const auth = require('../middleware/auth');

router.get('/student', auth('student'), historyController.getStudentHistory);
router.get('/admin', auth('admin', 'union'), historyController.getAllLogs);

module.exports = router;
