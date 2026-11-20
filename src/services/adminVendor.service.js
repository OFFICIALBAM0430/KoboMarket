
const VendorStore = require('../models/vendorStore.model');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getPendingStores = async () => {
    return VendorStore.find({ status: 'pending' })
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: 1 });
};

const approveVendorStore = async (storeId) => {
    const store = await VendorStore.findOneAndUpdate(
        { _id: storeId, status: 'pending' },
        {
            status: 'active',
            rejectionReason: null
        },
        { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

    if (!store) {
        throw createError('Pending vendor store not found', 404);
    }

    return store;
};

const rejectVendorStore = async (storeId, reason) => {
    const store = await VendorStore.findOneAndUpdate(
        { _id: storeId, status: 'pending' },
        {
            status: 'rejected',
            rejectionReason: reason
        },
        { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

    if (!store) {
        throw createError('Pending vendor store not found', 404);
    }

    return store;
};

const suspendVendorStore = async (storeId, reason) => {
    const store = await VendorStore.findOneAndUpdate(
        { _id: storeId, status: 'active' },
        {
            status: 'suspended',
            rejectionReason: reason
        },
        { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

    if (!store) {
        throw createError('Active vendor store not found', 404);
    }

    return store;
};

module.exports = {
    getPendingStores,
    approveVendorStore,
    rejectVendorStore,
    suspendVendorStore
};
