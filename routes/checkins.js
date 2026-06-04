const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkinController = require('../controllers/checkin-controller');

// @route   POST api/checkins
// @desc    Perform check-in with multi-factor validation
// @access  Student
router.post('/', auth('student'), checkinController.checkin);

module.exports = router;
