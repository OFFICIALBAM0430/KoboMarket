const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');

const {
    openDisputeSchema,
    resolveDisputeSchema
} = require('../validators/dispute.validator');

const {
    openOrderDispute,
    resolveOrderDispute
} = require('../controllers/dispute.controller');

router.use(protect);

router.post(
    '/orders/:subOrderId',
    validate(openDisputeSchema),
    openOrderDispute
);

router.patch(
    '/admin/:disputeId/resolve',
    authorize('admin'),
    validate(resolveDisputeSchema),
    resolveOrderDispute
);

module.exports = router;
