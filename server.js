var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var session = require('express-session');
var cookieParser = require('cookie-parser');
var sharedsession = require("express-socket.io-session");
var validator = require('validator');

require('dotenv').config();

var sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
});

app.use(cookieParser());
app.use(sessionMiddleware);

// Object to map socket IDs to nicknames
var sessionToNickname = {}

// Array to store recent chat messages
// this is reset every server restart!
var recentMessages = [];

// Function to add a new message to recent messages
function addRecentMessage(message) {
    recentMessages.push(message);
    // Limit the number of recent messages
    if (recentMessages.length > process.env.MAX_RECENT_CHATS) {
        recentMessages.shift(); // Remove the oldest message
    }
}

function sanitizeString(input) {
    input = input.replace(/(<([^>]+)>)/ig,""); // remove html tags
    input = validator.escape(input); // try to remove more potential xss stuff
    return input;
}

function sanitizeNick(input)
{
    input = sanitizeString(input);
    input = input.replace(/\s+/g, '_'); // replace spaces with underscores
    return input;
}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post('/set-nickname', express.json(), function (req, res) {
    var nickname = req.body.nickname;
  
    // Check if the nickname is empty
    if (!nickname || nickname.trim() === '') {
      res.status(400).send({ success: false, message: 'Nickname cannot be empty.' });
      return;
    }
  
    // Check if the nickname is already in use
    if (Object.values(sessionToNickname).includes(nickname)) {
      res.send({ success: false, message: 'Nickname already in use.' });
    } else {
      nickname = sanitizeNick(nickname);
      req.session.nickname = nickname;
      res.send({ success: true, nickname: req.session.nickname });
    }
});

// Use shared session middleware for socket.io
io.use(sharedsession(sessionMiddleware, {
    autoSave: true
}));

// each connection goes through here
io.on('connection', function (socket) {

    console.log("session id", socket.handshake.session.id);

    if(socket.handshake.session.nickname)
    {
        socket.emit('set nickname', socket.handshake.session.nickname);
        sessionToNickname[socket.handshake.session.id] = socket.handshake.session.nickname;
    }
    io.emit('connected users', Object.values(sessionToNickname));
    console.log("all sessions", sessionToNickname);

    // Send the nickname if already set
    socket.on('get nickname', function () {
        if (socket.handshake.session.nickname) {
            socket.emit('set nickname', socket.handshake.session.nickname);
            io.emit('user connected', socket.handshake.session.nickname);
        }
    });

    // Set nickname on server and update session
    socket.on('set nickname', function (nickname) {
        socket.handshake.session.nickname = nickname;
        socket.handshake.session.save(); // Save the session
        sessionToNickname[socket.handshake.session.id] = socket.handshake.session.nickname;
        console.log(sessionToNickname);
        socket.emit('set nickname', nickname); // Confirm back to the client
        io.emit('user connected', nickname);
        io.emit('connected users', Object.values(sessionToNickname));
    });

    // Listen for chat messages
    socket.on('chat message', function (msg) {
        var nickname = socket.handshake.session.nickname;
    
        // Check if the nickname is not set
        if (!nickname || nickname.trim() === '') {
            return; // Exit the function early if the nickname is not set
        }

        msg = sanitizeString(msg);
    
        // Check if the message is empty
        if (!msg || msg.trim() === '') {
            return; // Exit the function early if the message is empty
        }
    
        var timestamp = formatMessageTime(new Date()); // Generate timestamp
    
        var message = { 
            nickname: nickname, 
            message: msg,
            timestamp: timestamp  // Include timestamp in the message object
        };
    
        addRecentMessage(message); // Add message to recent messages
        io.emit('chat message', message); // Broadcast the message with timestamp
    });

    // Function to format message time
    function formatMessageTime(date) {
        var hours = date.getHours().toString().padStart(2, '0');
        var minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Send recent messages to new user upon connection
    socket.on('get recent messages', function () {
        socket.emit('recent messages', recentMessages);
    });

    // Handle disconnection
    socket.on('disconnect', function () {
        var nickname = socket.handshake.session.nickname;
        if (nickname) {
            io.emit('user disconnected', nickname);
            delete sessionToNickname[socket.handshake.session.id];
            io.emit('connected users', Object.values(sessionToNickname));
        }
    });

    // WebRTC signaling
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });
});

server.listen(process.env.PORT, function () {
    console.log(`Listening on http://${process.env.HOST}:${server.address().port}`);
});