
jest.mock('../models/vendorStore.model', () => ({
    findById: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    create: jest.fn()
}));

jest.mock('../models/user.model', () => ({
    findById: jest.fn()
}));

const VendorStore = require('../models/vendorStore.model');
const User = require('../models/user.model');

const {
    createVendorStore,
    getVendorStore,
    updateVendorStore
} = require('../services/vendor.service');

describe('Vendor Store Service Tests', () => {
    let user;

    beforeEach(() => {
        jest.clearAllMocks();

        user = {
            _id: 'user-101',
            isEmailVerified: true,
            accountStatus: 'active',
            roles: ['buyer'],
            save: jest.fn().mockResolvedValue(true)
        };

        User.findById.mockResolvedValue(user);
        VendorStore.findOne.mockResolvedValue(null);
        VendorStore.exists.mockResolvedValue(false);
        VendorStore.create.mockResolvedValue({
            _id: 'store-101',
            owner: 'user-101',
            storeName: 'Bam Electronics',
            slug: 'bam-electronics',
            status: 'pending'
        });
    });

    describe('createVendorStore', () => {
        it('should reject a user who does not exist', async () => {
            User.findById.mockResolvedValue(null);

            await expect(
                createVendorStore('user-101', {
                    storeName: 'Bam Electronics'
                })
            ).rejects.toThrow('User not found');
        });

        it('should reject a user whose email is not verified', async () => {
            user.isEmailVerified = false;

            await expect(
                createVendorStore('user-101', {
                    storeName: 'Bam Electronics'
                })
            ).rejects.toThrow(
                'Please verify your email before creating a store'
            );
        });

        it('should reject an inactive user account', async () => {
            user.accountStatus = 'suspended';

            await expect(
                createVendorStore('user-101', {
                    storeName: 'Bam Electronics'
                })
            ).rejects.toThrow('Your account is not active');
        });

        it('should reject a user who already has a store', async () => {
            VendorStore.findOne.mockResolvedValue({
                _id: 'existing-store'
            });

            await expect(
                createVendorStore('user-101', {
                    storeName: 'Bam Electronics'
                })
            ).rejects.toThrow('You already have a vendor store');
        });

        it('should create a pending vendor store', async () => {
            const result = await createVendorStore('user-101', {
                storeName: 'Bam Electronics',
                description: 'Electronics store'
            });

            expect(VendorStore.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    owner: 'user-101',
                    storeName: 'Bam Electronics',
                    slug: 'bam-electronics',
                    description: 'Electronics store',
                    status: 'pending'
                })
            );

            expect(result.status).toBe('pending');
        });

        it('should add the vendor role to the user', async () => {
            await createVendorStore('user-101', {
                storeName: 'Bam Electronics'
            });

            expect(user.roles).toContain('vendor');
            expect(user.save).toHaveBeenCalled();
        });

        it('should not duplicate an existing vendor role', async () => {
            user.roles = ['buyer', 'vendor'];

            await createVendorStore('user-101', {
                storeName: 'Bam Electronics'
            });

            expect(user.roles.filter(role => role === 'vendor')).toHaveLength(1);
            expect(user.save).not.toHaveBeenCalled();
        });
    });

    describe('getVendorStore', () => {
        it('should retrieve the store belonging to a user', async () => {
            const store = {
                _id: 'store-101',
                owner: 'user-101'
            };

            VendorStore.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(store)
            });

            const result = await getVendorStore('user-101');

            expect(VendorStore.findOne)
                .toHaveBeenCalledWith({ owner: 'user-101' });

            expect(result).toEqual(store);
        });
    });

    describe('updateVendorStore', () => {
        it('should reject an update when the store does not exist', async () => {
            VendorStore.findOne.mockResolvedValue(null);

            await expect(
                updateVendorStore('user-101', {
                    description: 'Updated description'
                })
            ).rejects.toThrow('Vendor store not found');
        });

        it('should reject updates to a suspended store', async () => {
            VendorStore.findOne.mockResolvedValue({
                status: 'suspended'
            });

            await expect(
                updateVendorStore('user-101', {
                    description: 'Updated description'
                })
            ).rejects.toThrow(
                'Your store cannot be updated in its current status'
            );
        });

        it('should update a store description', async () => {
            const store = {
                status: 'active',
                description: 'Old description',
                save: jest.fn().mockResolvedValue(true)
            };

            VendorStore.findOne.mockResolvedValue(store);

            const result = await updateVendorStore('user-101', {
                description: 'New description'
            });

            expect(result.description).toBe('New description');
            expect(store.save).toHaveBeenCalled();
        });
    });
});
             
