const socket = io();
let currentRoom = '';
let currentUsername = '';
let typingTimeout = undefined;
let isTyping = false;

const chatArea = document.getElementById('chat-area');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const sendButton = document.querySelector('button[onclick="sendMessage()"]');

// Función para mostrar mensajes
function displayMessage(data, isMyMessage = false) {
    const msgElement = document.createElement('div');
    msgElement.classList.add('message');

    let messageClass = 'other-message';
    let sender = data.user;

    if (data.user === 'Sistema') {
        messageClass = 'system-message';
    } else if (isMyMessage) {
        messageClass = 'my-message';
        sender = 'Tú';
    }

    msgElement.classList.add(messageClass);
    msgElement.innerHTML = `<strong>${sender}</strong> [${data.timestamp}]: ${data.text}`;
    chatArea.appendChild(msgElement);
    chatArea.scrollTop = chatArea.scrollHeight; // Scroll automático
}

// 4. Unirse a una Sala (Rooms)
function joinRoom() {
    const roomInput = document.getElementById('room-input').value.trim();
    const usernameInput = document.getElementById('username-input').value.trim() || 'Anónimo';

    if (!roomInput) {
        alert("Debes ingresar un nombre de sala.");
        return;
    }

    currentUsername = usernameInput;
    currentRoom = roomInput;

    document.getElementById('current-room').textContent = currentRoom;
    document.getElementById('current-username').textContent = currentUsername;

    // Emitir evento 'room:join' con 'ack' (callback)
    socket.emit('room:join', currentRoom, currentUsername, (response) => {
        document.getElementById('join-status').textContent = response;
        chatArea.innerHTML = ''; // Limpiar chat al cambiar de sala
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    });
}

// 4. Enviar Mensaje (con ACK)
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '' || !currentRoom) return;

    const messageData = {
        room: currentRoom,
        message: message
    };

    // Emitir evento 'chat:message' con 'ack' (callback)
    socket.emit('chat:message', messageData, (ack) => {
        // 5. Manejo del ACK
        console.log('ACK del servidor:', ack);
        if (ack.status === 'ok') {
            // Opcionalmente, mostrar una confirmación visual
            console.log('Mensaje enviado y confirmado.');
        }
    });

    messageInput.value = '';

    // Si estaba escribiendo, detener el typing al enviar
    if (isTyping) {
        isTyping = false;
        socket.emit('chat:typing', false);
    }
}

// Manejo del evento 'input' para el indicador "escribiendo..."
messageInput.addEventListener('input', () => {
    if (!currentRoom) return;

    // 4. Indicador “escribiendo…”
    if (!isTyping) {
        isTyping = true;
        socket.emit('chat:typing', true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            isTyping = false;
            socket.emit('chat:typing', false);
        }
    }, 1500); // 1.5 segundos sin escribir
});

// Escuchar eventos

// Recibir mensajes
socket.on('chat:message', (data) => {
    const isMyMessage = data.user === currentUsername;
    displayMessage(data, isMyMessage);
    // Si recibo un mensaje, limpio el indicador de typing, por si acaso
    typingIndicator.textContent = '';
});

// Recibir indicador "escribiendo..."
socket.on('chat:typing', (data) => {
    if (data.isTyping) {
        typingIndicator.textContent = `${data.user} está escribiendo...`;
    } else {
        typingIndicator.textContent = '';
    }
});

// Manejar Enter para enviar
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
