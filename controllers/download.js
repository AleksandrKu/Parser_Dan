'use strict';
const path = require("path");
const { config } = require('../config');
const pathFile = config.pathFile;

function download(req, res) {
    try {
        console.log("downloadFile!");
        const file = path.join(__dirname, "..", pathFile);
        res.download(file);
    } catch (err) {
        console.log("Error !");
        res.render('error.twig', {message: 'Error download file'});
    }
}
module.exports.downloadFile = download;