const { check, validationResult } = require('express-validator');

const validateChat = [
    check('messages')
        .isArray()
        .withMessage('Messages must be an array')
        .notEmpty()
        .withMessage('Messages array cannot be empty'),
    check('messages.*.role')
        .isIn(['user', 'assistant', 'system'])
        .withMessage('Invalid message role'),
    check('messages.*.content')
        .isString()
        .withMessage('Message content must be string')
        .notEmpty()
        .withMessage('Message content cannot be empty')
        .trim()
        .escape(),
    check('temperature')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('Temperature must be between 0 and 1'),
];

const validatePersonality = [
    check('userName')
        .isString()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Username is required'),
    check('name')
        .isString()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Name is required'),
    check('age')
        .isString()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Age is required'),
    check('traits')
        .isString()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Traits are required'),
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateChat,
    validatePersonality,
    validate
}; 