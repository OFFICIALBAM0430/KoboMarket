
const adminVendorService = require('../services/adminVendor.service');

const handleError = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.statusCode ? 'ADMIN_VENDOR_ERROR' : 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Something went wrong',
            details: []
        }
    });
};

const getPendingStores = async (req, res) => {
    try {
        const stores = await adminVendorService.getPendingStores();

        return res.status(200).json({
            success: true,
            count: stores.length,
            data: stores
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const approveStore = async (req, res) => {
    try {
        const store = await adminVendorService.approveVendorStore(
            req.params.storeId
        );

        return res.status(200).json({
            success: true,
            message: 'Vendor store approved successfully',
            data: store
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const rejectStore = async (req, res) => {
    try {
        const store = await adminVendorService.rejectVendorStore(
            req.params.storeId,
            req.body.reason
        );

        return res.status(200).json({
            success: true,
            message: 'Vendor store rejected successfully',
            data: store
        });
    } catch (error) {
        return handleError(res, error);
    }
};

const suspendStore = async (req, res) => {
    try {
        const store = await adminVendorService.suspendVendorStore(
            req.params.storeId,
            req.body.reason
        );

        return res.status(200).json({
            success: true,
            message: 'Vendor store suspended successfully',
            data: store
        });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getPendingStores,
    approveStore,
    rejectStore,
    suspendStore
};
