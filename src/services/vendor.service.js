
const VendorStore = require('../models/vendorStore.model');
const User = require('../models/user.model');
const slugify = require('slugify');

const generateUniqueSlug = async (storeName) => {
    const baseSlug = slugify(storeName, {
        lower: true,
        strict: true,
        trim: true
    });

    let slug = baseSlug;
    let count = 1;

    while (await VendorStore.exists({ slug })) {
        slug = `${baseSlug}-${count}`;
        count++;
    }

    return slug;
};

const createVendorStore = async (userId, storeData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (!user.isEmailVerified) {
        throw new Error('Please verify your email before creating a store');
    }

    if (user.accountStatus !== 'active') {
        throw new Error('Your account is not active');
    }

    const existingStore = await VendorStore.findOne({
        owner: userId
    });

    if (existingStore) {
        throw new Error('You already have a vendor store');
    }

    const slug = await generateUniqueSlug(storeData.storeName);

    const store = await VendorStore.create({
        owner: userId,
        storeName: storeData.storeName,
        slug,
        description: storeData.description || '',
        status: 'pending'
    });

    if (!user.roles.includes('vendor')) {
        user.roles.push('vendor');
        await user.save();
    }

    return store;
};

const getVendorStore = async (userId) => {
    return VendorStore.findOne({ owner: userId })
        .populate('owner', 'firstName lastName email');
};

const updateVendorStore = async (userId, updateData) => {
    const store = await VendorStore.findOne({ owner: userId });

    if (!store) {
        throw new Error('Vendor store not found');
    }

    if (store.status === 'suspended' || store.status === 'rejected') {
        throw new Error('Your store cannot be updated in its current status');
    }

    if (updateData.storeName) {
        store.storeName = updateData.storeName;
        store.slug = await generateUniqueSlug(updateData.storeName);
    }

    if (updateData.description !== undefined) {
        store.description = updateData.description;
    }

    await store.save();

    return store;
};

module.exports = {
    createVendorStore,
    getVendorStore,
    updateVendorStore
};
