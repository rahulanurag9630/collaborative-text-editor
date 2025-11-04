import { body, param, validationResult } from 'express-validator';
import { isValidObjectId } from '../config/mongo.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  validate,
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

export const documentValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  validate,
];

export const shareValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('role').isIn(['viewer', 'editor']).withMessage('Role must be viewer or editor'),
  validate,
];

export const objectIdValidation = [
  param('id').custom((value) => isValidObjectId(value)).withMessage('Invalid ID format'),
  validate,
];
