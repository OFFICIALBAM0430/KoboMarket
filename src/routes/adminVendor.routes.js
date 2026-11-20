
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    rejectVendorStoreSchema
} = require('../validators/adminVendor.validator');

const {
    getPendingStores,
    approveStore,
    rejectStore,
    suspendStore
} = require('../controllers/adminVendor.controller');

router.use(protect, authorize('admin'));
router.get('/pending', getPendingStores);

router.patch('/:storeId/approve', approveStore);
router.patch(
    '/:storeId/reject',
    validate(rejectVendorStoreSchema),
    rejectStore
);
router.patch(
    '/:storeId/suspend',
    validate(rejectVendorStoreSchema),
    suspendStore
);

module.exports = router;
