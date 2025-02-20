const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./messages.db", (err) => {
    if (err) {
        console.error("Erreur connexion DB:", err);
    } else {
        console.log("✅ Connecté à la base SQLite3");
    }
});

module.exports = db;
