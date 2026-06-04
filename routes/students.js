const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const studentController = require('../controllers/student-controller');

// Student management — Admin + Union can manage students
router.get('/', auth('admin', 'union'), studentController.getAllStudents);
router.post('/', auth('admin', 'union'), studentController.createStudent);
router.put('/:id', auth('admin', 'union'), studentController.updateStudent);
router.delete('/:id', auth('admin', 'union'), studentController.deleteStudent);

module.exports = router;

