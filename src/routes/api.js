const express = require('express');
const router = express.Router();

const itemControllers = require('../controllers/items');
const conversationControllers = require('../controllers/conversations');


router.get('/search', itemControllers.itemsSearch);
router.get('/trending', itemControllers.itemsTrending);
router.post('/pushConversation', conversationControllers.addConversation);
router.put('/updateConversation', conversationControllers.updateConversation);
router.post('/findConversationByUser', conversationControllers.findConversationsByUser);
// router.get('/test', itemControllers.test).

module.exports = router;