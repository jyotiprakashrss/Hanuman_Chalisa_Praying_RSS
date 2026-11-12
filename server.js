const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = 3000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your index.html and images) from the current folder
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database (creates a file named 'devotees.db')
const db = new sqlite3.Database('./devotees.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table with gender column if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS registrants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT,
            gender TEXT,
            phoneNumber TEXT,
            stateLocation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
            if (!createErr) {
                // Migration check: Add gender column if an older version of the table exists without it
                db.run(`ALTER TABLE registrants ADD COLUMN gender TEXT`, () => { });
            }
        });
    }
});

// API Endpoint to handle form submission from your frontend
app.post('/api/register', (req, res) => {
    const { fullName, gender, phoneNumber, stateLocation } = req.body;

    if (!fullName || !gender || !phoneNumber || !stateLocation) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const query = `INSERT INTO registrants (fullName, gender, phoneNumber, stateLocation) VALUES (?, ?, ?, ?)`;
    db.run(query, [fullName, gender, phoneNumber, stateLocation], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.json({ success: true, message: 'Registration saved successfully!' });
    });
});

// Admin API Endpoint to view all registered devotees in JSON format
app.get('/api/devotees', (req, res) => {
    db.all(`SELECT * FROM registrants ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Simple Admin View route to see a list and quick WhatsApp buttons
app.get('/admin', (req, res) => {
    db.all(`SELECT * FROM registrants ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Database error.');
        }

        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Admin Dashboard - Devotees</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 30px; }
                h1 { color: #b71c1c; }
                table { width: 100%; border-collapse: collapse; background: #fff; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                th, td { padding: 12px 15px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #ff6f00; color: white; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .wa-btn { background: #25d366; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .wa-btn:hover { background: #1ebe5d; }
            </style>
        </head>
        <body>
            <h1>🙏 Registered Devotees Dashboard</h1>
            <p>Total Registrations: <strong>${rows.length}</strong></p>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Gender</th>
                    <th>WhatsApp Number</th>
                    <th>State</th>
                    <th>Registration Time</th>
                    <th>Action</th>
                </tr>`;

        rows.forEach(row => {
            // Format WhatsApp Direct Link
            const waLink = `https://wa.me/91${row.phoneNumber}?text=Jai%20Shri%20Ram,%20${encodeURIComponent(row.fullName)}!%20Thank%20you%20for%20registering%20for%20the%20Hanuman%20Chalisha%20temple%20prayer.`;
            html += `<tr>
                <td>${row.id}</td>
                <td>${row.fullName}</td>
                <td>${row.gender || 'N/A'}</td>
                <td>${row.phoneNumber}</td>
                <td>${row.stateLocation}</td>
                <td>${row.created_at}</td>
                <td><a class="wa-btn" href="${waLink}" target="_blank">Chat on WhatsApp</a></td>
            </tr>`;
        });

        html += `</table></body></html>`;
        res.send(html);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running live at: http://localhost:${PORT}`);
    console.log(`Admin dashboard available at: http://localhost:${PORT}/admin`);
});