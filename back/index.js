const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require('./db/database'); // ✅ Import correct de la base de données

const app = express();
const server = http.createServer(app); // Serveur HTTP
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Adresse de ton frontend React
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// ✅ Supprimer la redéclaration inutile de `db`

// Création de la table si elle n'existe pas
db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
console.log("✅ Table messages vérifiée !");

// Vérifie si la colonne "read" existe avant de l'ajouter
db.all("PRAGMA table_info(messages)", (err, columns) => {
    if (err) {
        console.error("Erreur lors de la vérification des colonnes:", err);
    } else {
        const columnExists = columns.some((col) => col.name === "read");
        if (!columnExists) {
            db.run("ALTER TABLE messages ADD COLUMN read INTEGER DEFAULT 0;", (err) => {
                if (err) console.error("Erreur lors de l'ajout de la colonne 'read':", err);
                else console.log("✅ Colonne 'read' ajoutée avec succès !");
            });
        }
    }
});

// Route pour récupérer les messages
app.get("/messages", (req, res) => {
    db.all("SELECT * FROM messages", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Route pour ajouter un message
app.post("/messages", (req, res) => {
    const { sender, content } = req.body;
    if (!sender || !content) return res.status(400).json({ error: "Données invalides" });

    db.run("INSERT INTO messages (sender, content) VALUES (?, ?)", [sender, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const newMessage = { id: this.lastID, sender, content };

        // Émet un événement pour notifier tous les clients
        io.emit("newMessage", newMessage);

        res.json(newMessage);
    });
});

// Marquer un message comme lu
app.post("/messages/read", (req, res) => {
    const { messageId } = req.body;
    db.run("UPDATE messages SET read = 1 WHERE id = ?", [messageId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        io.emit("messageRead", messageId); // Notifier tous les clients
        res.json({ messageId, read: true });
    });
});

// Connexion WebSocket
io.on("connection", (socket) => {
    console.log("🟢 Un utilisateur s'est connecté");

    socket.on("typing", (username) => {
        socket.broadcast.emit("userTyping", username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("userStoppedTyping");
    });

    socket.on("disconnect", () => {
        console.log("🔴 Un utilisateur s'est déconnecté");
    });
});

// Lancement du serveur
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`);
});
