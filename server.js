const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Subhakanta_1'; // Change this in production for security

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your index.html and images) from the current folder
app.use(express.static(path.join(__dirname, '.')));

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

// 1. Program Leader Admin Dashboard Route (Password Protected)
app.get('/admin/devotees', (req, res) => {
    if (req.query.admin_password !== ADMIN_PASSWORD) {
        return res.status(403).send('<h3>Access Denied.</h3><p>Please check your admin password.</p>');
    }

    db.all(`SELECT * FROM registrants ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error reading database.');
        }

        let tableRows = rows.map(row => {
            const waLink = `https://wa.me/91${row.phoneNumber}?text=Jai%20Shri%20Ram,%20${encodeURIComponent(row.fullName)}!%20Thank%20you%20for%20registering%20for%20the%20Hanuman%20Chalisha%20temple%20prayer.`;
            return `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.fullName || ''}</td>
                    <td>${row.gender || 'N/A'}</td>
                    <td><a href="tel:${row.phoneNumber}">${row.phoneNumber || ''}</a></td>
                    <td>${row.stateLocation || ''}</td>
                    <td>${row.created_at || ''}</td>
                    <td><a class="wa-btn" href="${waLink}" target="_blank">Chat on WhatsApp</a></td>
                </tr>
            `;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Admin Dashboard - Devotees</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fdfaf6; padding: 20px; }
                    h1 { color: #b71c1c; margin-bottom: 5px; }
                    .btn { display: inline-block; padding: 10px 16px; background: #b44300; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0 20px 0; }
                    .btn:hover { background: #8f3500; }
                    table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    th, td { padding: 12px 15px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #ff6f00; color: white; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .wa-btn { background: #25d366; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; }
                    .wa-btn:hover { background: #1ebe5d; }
                </style>
            </head>
            <body>
                <h1>🙏 Registered Devotees Dashboard</h1>
                <p>Total Registrations: <strong>${rows.length}</strong></p>
                <a class="btn" href="/admin/export?admin_password=${ADMIN_PASSWORD}">Download Excel / CSV</a>
                <table>
                    <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Phone Number</th>
                        <th>Location</th>
                        <th>Registration Time</th>
                        <th>Action</th>
                    </tr>
                    ${tableRows}
                </table>
            </body>
            </html>
        `);
    });
});

// 2. One-Click CSV Download Route for Excel/Google Sheets (Password Protected)
app.get('/admin/export', (req, res) => {
    if (req.query.admin_password !== ADMIN_PASSWORD) {
        return res.status(403).send('Access Denied.');
    }

    db.all(`SELECT * FROM registrants ORDER BY id ASC`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Database error.');
        }

        let csv = 'ID,Full Name,Gender,Phone Number,Location,Registration Time\n';
        rows.forEach(r => {
            csv += `"${r.id}","${(r.fullName || '').replace(/"/g, '""')}","${r.gender || ''}","${r.phoneNumber || ''}","${(r.stateLocation || '').replace(/"/g, '""')}","${r.created_at || ''}"\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('hanuman-chalisa-devotees.csv');
        res.send(csv);
    });
});

// Start Server bound properly to 0.0.0.0 for Render
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running live on port ${PORT}`);
});