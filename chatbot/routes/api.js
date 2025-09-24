const express = require('express');
const router = express.Router();  

const itemControllers = require('../controllers/items');

router.post('/search', itemControllers.itemsRag);
// router.get('/test', itemControllers.test);


module.exports = router;