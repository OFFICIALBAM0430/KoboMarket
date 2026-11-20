const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const vendorRoutes = require('./routes/vendor.routes');
const productRoutes = require('./routes/product.routes');
const adminVendorRoutes = require('./routes/adminVendor.routes');
const cartRoutes = require('./routes/cart.routes');
const reviewRoutes = require('./routes/review.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send("Kobomarket API is running");
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/admin/vendors', adminVendorRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1', reviewRoutes);

module.exports = app;
