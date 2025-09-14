const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validateInterviewStart = [
  body('candidateName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Candidate name must be between 2 and 100 characters'),
  body('candidateEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  validateRequest
];

const validateEventLog = [
  body('eventType')
    .isIn(['focus_lost', 'face_missing', 'multiple_faces', 'phone_detected', 'book_detected', 'device_detected', 'drowsiness_detected', 'audio_anomaly', 'screen_share', 'tab_switch'])
    .withMessage('Invalid event type'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  body('timestamp')
    .isISO8601()
    .withMessage('Valid timestamp is required'),
  validateRequest
];

const validateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateRequest
];

module.exports = {
  validateInterviewStart,
  validateEventLog,
  validateUser,
  validateRequest
};
