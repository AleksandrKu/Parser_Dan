'use strict';
const express = require('express');
const router = express.Router();
const { mainPage } = require('../controllers/index.js');
const { downloadFile } = require('../controllers/download');

router.get('/', mainPage );
router.get('/download',  downloadFile );
module.exports = router;
