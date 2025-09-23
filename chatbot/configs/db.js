const mongoose = require('mongoose');

mongoose.connect('mongodb://sit725:sit725groupproject@localhost:20725/SIT725GP', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

module.exports = mongoose;
