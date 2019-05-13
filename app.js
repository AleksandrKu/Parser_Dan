'use strict';
const express = require('express');
const path = require('path');


const port = normalizePort(process.env.PORT || '3131');
const http = require('http');

const indexRouter = require('./routes/index');
const parseRouter = require('./routes/parser');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {serveClient: true});

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(function(req,res,next){
    req.io = io;
    next();
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/parse', parseRouter);

app.set('port', port);

server.listen(port, () => {
    console.log("Server running on port: " + port);
});
server.on('error', onError);

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}