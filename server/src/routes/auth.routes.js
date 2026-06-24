const router = require('express').Router();
const { login, logout, refreshToken, getMe, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { loginSchema, changePasswordSchema } = require('../validations/auth.validation');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.patch('/me/password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
