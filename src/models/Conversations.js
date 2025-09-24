const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    id: String,
    user_id: String,
    eddited_time: Date,
    name: String,
    history: Object
});

module.exports = mongoose.model('Conversations', ConversationSchema);