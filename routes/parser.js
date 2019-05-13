'use strict';
const express = require('express');
const router = express.Router();
const {parserController} = require('../controllers/growthhackers');
global.numberPages = 15;
global.numberUsers = 500;
router.post('/', (req, res) => {
    console.log('parse start');
    if (req.body && req.body.key == 'start') {
        console.log(req.body.key);
        global.numberPages = req.body.pages;
        global.numberUsers = req.body.numberUsers;
        return parserController(req, res);
    }
});

module.exports = router;