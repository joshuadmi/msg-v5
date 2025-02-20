import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000/messages";
const socket = io("http://localhost:5000"); // Connexion au serveur WebSocket

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sender, setSender] = useState("");
    const [typingUser, setTypingUser] = useState(null);
    const [readMessages, setReadMessages] = useState([]);

    // Charger les messages au démarrage
    useEffect(() => {
        axios.get(API_URL)
            .then(response => setMessages(response.data))
            .catch(error => console.error("Erreur lors du chargement des messages", error));

        // Écoute des nouveaux messages en temps réel
        socket.on("newMessage", (message) => {
            setMessages((prevMessages) => [message, ...prevMessages]); // Ajoute le message en haut
        });

        return () => {
            socket.off("newMessage"); // Nettoyage de l'écouteur
        };
    }, []);

    useEffect(() => {
        socket.on("messageRead", (messageId) => {
            setReadMessages((prev) => [...prev, messageId]);
        });
    
        return () => socket.off("messageRead");
    }, []);
    
    const markAsRead = (messageId) => {
        if (!readMessages.includes(messageId)) {
            axios.post("http://localhost:5000/messages/read", { messageId })
                .catch((error) => console.error("Erreur lors de la confirmation de lecture", error));
        }
    };
    

    // Fonction pour envoyer un message
    const sendMessage = () => {
        if (!sender || !newMessage) {
            alert("Veuillez entrer un nom et un message !");
            return;
        }
    
        axios.post(API_URL, { sender, content: newMessage })
            .then(() => {
                setNewMessage("");
                socket.emit("stopTyping"); // Arrête l'indicateur de frappe
            })
            .catch(error => console.error("Erreur lors de l'envoi du message", error));
    };
    

    useEffect(() => {
        socket.on("userTyping", (username) => {
            setTypingUser(username);
        });
    
        socket.on("userStoppedTyping", () => {
            setTypingUser(null);
        });
    
        return () => {
            socket.off("userTyping");
            socket.off("userStoppedTyping");
        };
    }, []);

    
    return (
        <div style={{ maxWidth: "400px", margin: "20px auto", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
            <h2>Messagerie en temps réel</h2>
            <input
                type="text"
                placeholder="Votre nom"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                style={{ width: "100%", marginBottom: "5px", padding: "5px" }}
            />
          <textarea
    placeholder="Écrivez votre message..."
    value={newMessage}
    onChange={(e) => {
        setNewMessage(e.target.value);
        socket.emit("typing", sender);
        setTimeout(() => socket.emit("stopTyping"), 2000); // Arrête après 2s sans écrire
    }}
/>

            <button onClick={sendMessage} style={{ width: "100%", padding: "10px", background: "blue", color: "white", border: "none", borderRadius: "3px" }}>
                Envoyer
            </button>
            {typingUser && <p style={{ color: "gray" }}>{typingUser} est en train d'écrire...</p>}

            <h3>Messages</h3>
            <ul>
    {messages.map((msg) => (
        <li key={msg.id} onClick={() => markAsRead(msg.id)}>
            <strong>{msg.sender}</strong>: {msg.content}
            {readMessages.includes(msg.id) && <span style={{ color: "green" }}> ✅</span>}
        </li>
    ))}
</ul>

        </div>
    );
}

export default Chat;
