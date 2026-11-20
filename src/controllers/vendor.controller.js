
const {
    createVendorStore,
    getVendorStore,
    updateVendorStore
} = require('../services/vendor.service');

const createStore = async (req, res) => {
    try {
        const store = await createVendorStore(req.user._id, req.body);

        return res.status(201).json({
            success: true,
            message: 'Vendor store application submitted successfully',
            data: { store }
        });
    } catch (error) {
        return res.status(
            error.message === 'You already have a vendor store' ? 409 :
            error.message === 'User not found' ? 404 :
            error.message.includes('verify') ||
            error.message.includes('active') ? 403 : 400
        ).json({
            success: false,
            message: error.message
        });
    }
};

const getMyStore = async (req, res) => {
    try {
        const store = await getVendorStore(req.user._id);

        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Vendor store not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: { store }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve vendor store'
        });
    }
};

const updateMyStore = async (req, res) => {
    try {
        const store = await updateVendorStore(req.user._id, req.body);

        return res.status(200).json({
            success: true,
            message: 'Vendor store updated successfully',
            data: { store }
        });
    } catch (error) {
        return res.status(
            error.message === 'Vendor store not found' ? 404 :
            error.message.includes('cannot be updated') ? 403 : 400
        ).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createStore,
    getMyStore,
    updateMyStore
};
