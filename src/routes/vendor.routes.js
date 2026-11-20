
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    createVendorStoreSchema,
    updateVendorStoreSchema
} = require('../validators/vendor.validator');

const {
    createStore,
    getMyStore,
    updateMyStore
} = require('../controllers/vendor.controller');


router.post(
    '/store',
    protect,
    validate(createVendorStoreSchema),
    createStore
);


router.get(
    '/store/me',
    protect,
    authorize('vendor'),
    getMyStore
);


router.patch(
    '/store/me',
    protect,
    authorize('vendor'),
    validate(updateVendorStoreSchema),
    updateMyStore
);

module.exports = router;
