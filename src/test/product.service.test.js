
jest.mock('../models/product.model', () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    distinct: jest.fn()
}));

jest.mock('../models/vendorStore.model', () => ({
    findOne: jest.fn(),
    distinct: jest.fn()
}));

const Product = require('../models/product.model');
const VendorStore = require('../models/vendorStore.model');

const {
    createProduct,
    getMyProducts,
    getPublicProducts,
    getPublicProduct,
    updateProduct,
    archiveProduct
} = require('../services/product.service');

describe('Product Service Tests', () => {
    const validProductId = '507f1f77bcf86cd799439011';

    let store;

    beforeEach(() => {
        jest.clearAllMocks();

        store = {
            _id: 'store-101',
            owner: 'user-101',
            status: 'active'
        };

        VendorStore.findOne.mockResolvedValue(store);
        Product.exists.mockResolvedValue(false);
    });

    describe('createProduct', () => {
        it('should reject creation when the vendor has no store', async () => {
            VendorStore.findOne.mockResolvedValue(null);

            await expect(
                createProduct('user-101', {
                    name: 'Laptop',
                    priceKobo: 500000
                })
            ).rejects.toThrow('Create a vendor store first');
        });

        it('should reject creation when the store is not active', async () => {
            VendorStore.findOne.mockResolvedValue({
                ...store,
                status: 'pending'
            });

            await expect(
                createProduct('user-101', {
                    name: 'Laptop',
                    priceKobo: 500000
                })
            ).rejects.toThrow(
                'Your vendor store must be approved before you can add products'
            );
        });

        it('should create a product as a draft', async () => {
            Product.create.mockResolvedValue({
                name: 'Laptop',
                slug: 'laptop',
                status: 'draft'
            });

            const result = await createProduct('user-101', {
                name: 'Laptop',
                priceKobo: 500000,
                stock: 10
            });

            expect(Product.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    store: store._id,
                    name: 'Laptop',
                    slug: 'laptop',
                    status: 'draft'
                })
            );

            expect(result.status).toBe('draft');
        });
    });

    describe('getMyProducts', () => {
        it('should reject when the vendor store does not exist', async () => {
            VendorStore.findOne.mockResolvedValue(null);

            await expect(
                getMyProducts('user-101')
            ).rejects.toThrow('Vendor store not found');
        });

        it('should retrieve products belonging to the vendor', async () => {
            const products = [{ name: 'Laptop' }];

            Product.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(products)
            });

            const result = await getMyProducts('user-101');

            expect(Product.find).toHaveBeenCalledWith({
                store: store._id
            });

            expect(result).toEqual(products);
        });

        it('should filter vendor products by status', async () => {
            Product.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            });

            await getMyProducts('user-101', {
                status: 'active'
            });

            expect(Product.find).toHaveBeenCalledWith({
                store: store._id,
                status: 'active'
            });
        });
    });

    describe('getPublicProducts', () => {
        it('should reject an invalid minimum price', async () => {
            VendorStore.distinct.mockResolvedValue([]);

            await expect(
                getPublicProducts({
                    minPriceKobo: '-10'
                })
            ).rejects.toThrow('Invalid minimum price filter');
        });

        it('should reject an invalid maximum price', async () => {
            VendorStore.distinct.mockResolvedValue([]);

            await expect(
                getPublicProducts({
                    maxPriceKobo: 'invalid'
                })
            ).rejects.toThrow('Invalid maximum price filter');
        });

        it('should reject a minimum price greater than maximum price', async () => {
            VendorStore.distinct.mockResolvedValue([]);

            await expect(
                getPublicProducts({
                    minPriceKobo: '50000',
                    maxPriceKobo: '10000'
                })
            ).rejects.toThrow(
                'Minimum price cannot exceed maximum price'
            );
        });

        it('should reject an invalid pagination cursor', async () => {
            VendorStore.distinct.mockResolvedValue([]);

            await expect(
                getPublicProducts({
                    cursor: 'not-an-object-id'
                })
            ).rejects.toThrow('Invalid pagination cursor');
        });

        it('should return public products with pagination information', async () => {
            const products = [
                { _id: 'product-1', name: 'Laptop' }
            ];

            VendorStore.distinct.mockResolvedValue(['store-101']);

            Product.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(products)
            });

            const result = await getPublicProducts({
                limit: '10'
            });

            expect(result.products).toEqual(products);
            expect(result.pagination.limit).toBe(10);
            expect(result.pagination.hasMore).toBe(false);
            expect(result.pagination.nextCursor).toBeNull();
        });
    });

    describe('getPublicProduct', () => {
        it('should reject an invalid product ID', async () => {
            await expect(
                getPublicProduct('invalid-id')
            ).rejects.toThrow('Invalid product ID');
        });

        it('should reject a product that does not exist', async () => {
            Product.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            await expect(
                getPublicProduct(validProductId)
            ).rejects.toThrow('Product not found');
        });

        it('should retrieve an active public product', async () => {
            const product = {
                _id: validProductId,
                name: 'Laptop',
                store: {
                    storeName: 'Bam Electronics'
                }
            };

            Product.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(product)
            });

            const result = await getPublicProduct(validProductId);

            expect(result).toEqual(product);
        });
    });

    describe('updateProduct', () => {
        it('should reject an invalid product ID', async () => {
            await expect(
                updateProduct('user-101', 'invalid-id', {})
            ).rejects.toThrow('Invalid product ID');
        });

        it('should reject when the vendor store does not exist', async () => {
            VendorStore.findOne.mockResolvedValue(null);

            await expect(
                updateProduct('user-101', validProductId, {})
            ).rejects.toThrow('Vendor store not found');
        });

        it('should reject when the store is inactive', async () => {
            VendorStore.findOne.mockResolvedValue({
                ...store,
                status: 'suspended'
            });

            await expect(
                updateProduct('user-101', validProductId, {})
            ).rejects.toThrow('Your vendor store is not active');
        });

        it('should reject a product not owned by the vendor', async () => {
            Product.findOne.mockResolvedValue(null);

            await expect(
                updateProduct('user-101', validProductId, {})
            ).rejects.toThrow('Product not found or you do not own it');
        });

        it('should update a product owned by the vendor', async () => {
            const product = {
                _id: validProductId,
                name: 'Old Laptop',
                slug: 'old-laptop',
                store: store._id,
                save: jest.fn().mockResolvedValue(true)
            };

            Product.findOne.mockResolvedValue(product);

            const result = await updateProduct(
                'user-101',
                validProductId,
                { description: 'Updated description' }
            );

            expect(result.description).toBe('Updated description');
            expect(product.save).toHaveBeenCalled();
        });
    });

    describe('archiveProduct', () => {
        it('should reject an invalid product ID', async () => {
            await expect(
                archiveProduct('user-101', 'invalid-id')
            ).rejects.toThrow('Invalid product ID');
        });

        it('should reject when the vendor store does not exist', async () => {
            VendorStore.findOne.mockResolvedValue(null);

            await expect(
                archiveProduct('user-101', validProductId)
            ).rejects.toThrow('Vendor store not found');
        });

        it('should archive a product belonging to the vendor', async () => {
            Product.findOneAndUpdate.mockResolvedValue({
                _id: validProductId,
                status: 'archived'
            });

            const result = await archiveProduct(
                'user-101',
                validProductId
            );

            expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: validProductId,
                    store: store._id
                },
                { status: 'archived' },
                { new: true }
            );

            expect(result.status).toBe('archived');
        });

        it('should reject a product that the vendor does not own', async () => {
            Product.findOneAndUpdate.mockResolvedValue(null);

            await expect(
                archiveProduct('user-101', validProductId)
            ).rejects.toThrow('Product not found or you do not own it');
        });
    });
});
      
