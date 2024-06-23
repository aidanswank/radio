// chat client

var socket = io();

// https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
function getColorForNickname(string) {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += value.toString(16).padStart(2, '0')
    }
    return color;
}

function appendMessage(timestamp, nickname, message) {
    var ul = document.getElementById('messages');
    var li = document.createElement('li');

    // Get color for the nickname
    var nicknameColor = getColorForNickname(nickname);

    // Create the message text with colored nickname
    var messageText = `${timestamp} &lt;<span style="color:${nicknameColor}">${nickname}</span>&gt; ${message}`;
    li.innerHTML = messageText;
    ul.appendChild(li);

    // Scroll to bottom of chat container
    var chatContainer = document.querySelector('.chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendSystemMessage(message) {
    var ul = document.getElementById('messages');
    var li = document.createElement('li');
    li.classList.add('system-message'); // Add system message class
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);

    // Scroll to bottom of chat container
    var chatContainer = document.querySelector('.chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


// Listen for chat messages
socket.on('chat message', function (msg) {
    appendMessage(msg.timestamp, msg.nickname, msg.message);
});

// Listen for recent messages from the server
socket.on('recent messages', function (messages) {
    var ul = document.getElementById('messages');
    ul.innerHTML = ''; // Clear existing messages

    messages.forEach(function (msg) {
        appendMessage(msg.timestamp, msg.nickname, msg.message);
    });
});
// Listen for connected users event
socket.on('connected users', function (users) {
    console.log("users", users);
    var connectedUsersElement = document.getElementById('connected-users');
    connectedUsersElement.innerHTML = ''; // Clear existing users

    var ul = document.createElement('ul');
    users.forEach(function (user) {
        var li = document.createElement('li');
        li.textContent = user;
        ul.appendChild(li);
    });

    connectedUsersElement.appendChild(ul);
});

// Listen for user disconnection messages
socket.on('user disconnected', function (nickname) {
    var message = nickname + ' has disconnected.';
    appendSystemMessage(message);
});

// Listen for user connection messages
socket.on('user connected', function (nickname) {
    var message = nickname + ' has connected.';
    appendSystemMessage(message);
});

// Handle form submission
document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('m');
    socket.emit('chat message', input.value);
    input.value = '';
    return false;
});

// Handle nickname setting
document.getElementById('set-nickname').addEventListener('click', function () {
    var nickname = document.getElementById('nickname').value;
    fetch('/set-nickname', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname: nickname })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                socket.emit('set nickname', data.nickname); // Emit event to server
                document.getElementById('nickname').value = ''; // Clear the input after setting nickname
                document.getElementById('current-nickname').innerText = 'Current Nickname: ' + nickname;
                // document.getElementsByName('nickname')[0].placeholder=nickname;
            }
        });
});

// Request nickname on connection
socket.emit('get nickname');

// Receive and display nickname
socket.on('set nickname', function (nickname) {
    document.getElementById('current-nickname').innerText = 'Current Nickname: ' + nickname;
    document.getElementById('form').style.display = 'flex'; // Show the chat input form if nickname is set
});


// Request recent messages on connection
socket.emit('get recent messages');