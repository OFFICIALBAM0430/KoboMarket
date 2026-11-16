const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');

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

module.exports = app;