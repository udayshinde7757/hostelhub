const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authController = require('../controllers/authController');

// Public: track a view (called from frontend when room is opened)
router.post('/rooms/:roomId/view', analyticsController.trackView);

// Admin-only analytics endpoints
router.use(authController.protect);
router.use(authController.authorizeRoles('admin'));

router.get('/top-rooms', analyticsController.getTopRooms);
router.get('/popular-locations', analyticsController.getPopularLocations);
router.get('/summary', analyticsController.getDashboardSummary);

module.exports = router;
