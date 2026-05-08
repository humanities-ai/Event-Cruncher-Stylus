const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const app = express();
const dotenv = require('dotenv');
//dotenv.config();
const OpenAI = require('openai');
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type']
}));

app.use(express.json());

app.use('/images', express.static(path.join(__dirname, 'public/images')));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mysql',
    database: 'ecsdb'
});

require("dotenv").config({
  path: path.join(__dirname, "server.env"),
  override: true,
});


// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Could not connect to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL Database');
});

// Insert a new account into the profiles DB
app.post('/api/users', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Check if the username already exists in the profiles table
        const checkQuery = 'SELECT COUNT(*) AS count FROM profiles WHERE username = ?';
        db.query(checkQuery, [username], async (err, results) => {
            if (err) {
                console.error('Error checking for existing username:', err.message);
                return res.status(500).json({ error: 'Database error' });
            }

            // Username already exists
            if (results[0].count > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Encrypt the password for security
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user into the profiles table
            const insertQuery = 'INSERT INTO profiles (username, password) VALUES (?, ?)';
            // db.query(insertQuery, [username, hashedPassword], (err, results) => {
            //     if (err) {
            //         console.error('Error inserting into profiles:', err.message);
            //         return res.status(500).json({ error: 'Database error' });
            //     }

            //     res.status(201).json({ message: 'User created successfully', userId: results.insertId });
            // });
            db.query(insertQuery, [username, hashedPassword], (err, results) => {
            
            if (err) {
                console.error('Error inserting into profiles:', err.message);
                return res.status(500).json({ error: 'Database error' });
            }

            const newUserId = results.insertId;

            // Create an empty cube row for this user
            const createAvDataQuery = `
                INSERT INTO avdata (user_id, who_text, what_text, when_text, where_text, why_text, how_text)
                VALUES (?, '', '', '', '', '', '')
            `;

            db.query(createAvDataQuery, [newUserId], (err2) => {
                if (err2) {
                console.error('Error inserting into avdata:', err2.message);
                return res.status(500).json({ error: 'Database error creating avdata' });
                }

                return res
                .status(201)
                .json({ message: 'User created successfully', userId: newUserId });
            });
            });

        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Validate username/password combo on Login page
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const query = 'SELECT id, password FROM profiles WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error querying profiles:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const { id, password: hashedPassword } = results[0];

        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (isMatch) {
            return res.status(200).json({ 
                message: 'Login successful', 
                userId: id
            });
        } else {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
    });
});

// Only update one face in the avdata table when new text is stored
// app.post('/api/avdata/update', upload.single('file'), (req, res) => {
//     const { user_id, face, text } = req.body;
//     const file = req.file;

//     console.log("Updating Data:", { user_id, face, text, file: file ? file.originalname : "No File" });

//     if (!user_id || !face) {
//         return res.status(400).json({ error: 'Missing required fields' });
//     }

//     const textColumn = face;
//     const fileColumn = `${face.replace('_text', '')}_files`;
//     const fileNameColumn = `${face.replace('_text', '')}_file_name`;
//     const fileTypeColumn = `${face.replace('_text', '')}_file_type`;
    

//     // Check if user exists in avdata table
//     const checkQuery = `SELECT * FROM avdata WHERE user_id = ?`;
//     db.query(checkQuery, [user_id], (err, results) => {
//         if (err) {
//             console.error("Database error:", err.message);
//             return res.status(500).json({ error: "Database check error" });
//         }

//         if (results.length === 0) {
//             console.log(`No entry found for user ${user_id}, inserting new row.`);
//             const insertQuery = `INSERT INTO avdata (user_id) VALUES (?)`;
//             db.query(insertQuery, [user_id], (insertErr) => {
//                 if (insertErr) {
//                     console.error("Error inserting new user into avdata:", insertErr.message);
//                     return res.status(500).json({ error: "Database insert error" });
//                 }
//                 console.log(`Inserted new entry for user ${user_id}`);
//                 updateAvData(user_id, textColumn, fileColumn, fileNameColumn, fileTypeColumn, text, file, res);
//             });
//         } else {
//             updateAvData(user_id, textColumn, fileColumn, fileNameColumn, fileTypeColumn, text, file, res);
//         }
//     });
// });
// Only update one face in the avdata table when new text is stored
app.post('/api/avdata/update', (req, res) => {
  const { user_id, face, text } = req.body;

  console.log("Updating Data:", { user_id, face, text });

  if (!user_id || !face) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const textColumn = face;

  // Check if user exists in avdata table
  const checkQuery = `SELECT * FROM avdata WHERE user_id = ?`;
  db.query(checkQuery, [user_id], (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database check error" });
    }

    const doUpdate = () => {
      const query = `UPDATE avdata SET ${textColumn} = ? WHERE user_id = ?`;
      db.query(query, [text || "", user_id], (updateErr) => {
        if (updateErr) {
          console.error("Database error during update:", updateErr.message);
          return res.status(500).json({ error: "Database update error" });
        }
        res.status(200).json({ message: `Updated ${textColumn} successfully` });
      });
    };

    if (results.length === 0) {
      console.log(`No entry found for user ${user_id}, inserting new row.`);
      const insertQuery = `INSERT INTO avdata (user_id) VALUES (?)`;
      db.query(insertQuery, [user_id], (insertErr) => {
        if (insertErr) {
          console.error("Error inserting new user into avdata:", insertErr.message);
          return res.status(500).json({ error: "Database insert error" });
        }
        console.log(`Inserted new entry for user ${user_id}`);
        doUpdate();
      });
    } else {
      doUpdate();
    }
  });
});


function updateAvData(user_id, textColumn, fileColumn, fileNameColumn, fileTypeColumn, text, file, res) {
    let query, values;

    if (file) {
        console.log("Storing file:", file.originalname, "Size:", file.size, "Type:", file.mimetype);

        query = `UPDATE avdata SET ${textColumn} = ?, ${fileColumn} = ?, ${fileNameColumn} = ?, ${fileTypeColumn} = ? WHERE user_id = ?`;
        values = [text || "", file.buffer, file.originalname, file.mimetype, user_id];
    } else {
        query = `UPDATE avdata SET ${textColumn} = ? WHERE user_id = ?`;
        values = [text || "", user_id];
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({ error: "Database update error" });
        }
        res.status(200).json({ message: `Updated ${textColumn} successfully` });
    });
}


app.get('/api/avdata/files/:userId/:face', (req, res) => {
    const { userId, face } = req.params;
    const fileColumn = `${face.replace('_text', '')}_files`;
    const fileNameColumn = `${face.replace('_text', '')}_file_name`;
    const fileTypeColumn = `${face.replace('_text', '')}_file_type`;
    
    console.log(`Fetching file for user ${userId}, face ${face}`);

    const query = `SELECT ${fileColumn}, ${fileNameColumn}, ${fileTypeColumn} FROM avdata WHERE user_id = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error while fetching file:', err.message);
            return res.status(500).json({ error: 'Database error while fetching file' });
        }

        if (results.length === 0 || !results[0][fileColumn]) {
            console.warn(`No file found for user ${userId}, face ${face}`);
            return res.status(404).json({ error: 'File not found' });
        }

        const fileData = results[0][fileColumn];
        let fileName = results[0][fileNameColumn] || `${face}.bin`;
        const fileType = results[0][fileTypeColumn] || "application/octet-stream";

        console.log("Retrieved File from DB:");
        console.log(` - File Name: ${fileName}`);
        console.log(` - File Type: ${fileType}`);
        console.log(` - File Size: ${fileData.length} bytes`);
        
        res.setHeader('Content-Type', fileType);
        //res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
        const safeName = file_name.replace(/"/g, "");
            res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
        );

        console.log("Here's the headers: ", res.getHeaders());
        res.send(Buffer.from(fileData));
    });
});


app.get('/api/avdata/:userId', (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const query = `SELECT user_id, who_text, what_text, when_text, where_text, why_text, how_text FROM avdata WHERE user_id = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error while fetching user data:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            console.error(`No data found for user ${userId}`);
            return res.status(404).json({ error: 'No data found for this user' });
        }

        console.log(`User data retrieved for user ${userId}`);
        res.status(200).json(results[0]);
    });
});


app.delete('/api/avdata/delete-file', (req, res) => {
    const { user_id, face } = req.body;

    if (!user_id || !face) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const fileColumn = `${face.replace('_text', '')}_files`;
    const fileNameColumn = `${face.replace('_text', '')}_file_name`;
    const fileTypeColumn = `${face.replace('_text', '')}_file_type`;

    const query = `UPDATE avdata SET ${fileColumn} = NULL, ${fileNameColumn} = NULL, ${fileTypeColumn} = NULL WHERE user_id = ?`;

    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Database error while deleting file:', err.message);
            return res.status(500).json({ error: 'Database update error' });
        }
        res.status(200).json({ message: `File for ${face} deleted successfully` });
    });
});


app.post("/api/update-criteria", async (req, res) => {
    const { userId, face, text } = req.body;
  
    console.log("Received Update Request:", { userId, face, text });
  
    if (userId !== "1") {
      console.warn("Unauthorized Access Attempt:", userId);
      return res.status(403).json({ error: "Unauthorized: Only admin can update criteria instructions." });
    }
  
    try {
      // Check if any row exists in the criteria table
      db.query("SELECT COUNT(*) AS count FROM criteria", (err, result) => {
        if (err) {
          console.error("Error checking criteria count:", err);
          return res.status(500).json({ error: "Database error while checking existing data." });
        }
  
        const rowCount = result[0].count;
  
        if (rowCount === 0) {
          // If no row exists, insert a default empty row
          const insertQuery = `
            INSERT INTO criteria (who_text, what_text, when_text, where_text, why_text, how_text) 
            VALUES ("", "", "", "", "", "")
          `;
  
          db.query(insertQuery, (insertErr, insertResult) => {
            if (insertErr) {
              console.error("Error inserting default criteria row:", insertErr);
              return res.status(500).json({ error: "Database error while inserting default row." });
            }
  
            console.log("Default criteria row inserted:", insertResult);
  
            updateCriteria();
          });
        } else {
          // If row exists, update it directly
          updateCriteria();
        }
      });
  
      function updateCriteria() {
        const query = `UPDATE criteria SET ${face} = ? WHERE id = 1`;
  
        db.query(query, [text], (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Database Error:", updateErr);
            return res.status(500).json({ error: "Database error while updating criteria." });
          }
  
          console.log("Criteria Updated Successfully:", updateResult);
          res.json({ message: "Criteria updated successfully!" });
        });
      }
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: "Server error." });
    }
  });
  
  app.get("/api/get-criteria", async (req, res) => {
    try {
      db.query("SELECT * FROM criteria LIMIT 1", (err, result) => {
        if (err) {
          console.error("Error fetching criteria:", err);
          return res.status(500).json({ error: "Database error." });
        }
  
        if (result.length === 0) {
          console.warn("No criteria found in database.");
          return res.json({
            who_text: "None.",
            what_text: "None.",
            when_text: "None.",
            where_text: "None.",
            why_text: "None.",
            how_text: "None.",
          });
        }
  
        console.log("Retrieved Criteria:", result[0]);
        res.json(result[0]);
      });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: "Server error." });
    }
  });
  

//   app.post('/api/avfiles/upload', upload.array('files', 10), (req, res) => {
//     const { user_id, face } = req.body;
//     const files = req.files;

//     if (!user_id || !face || !files?.length) {
//         return res.status(400).json({ error: 'Missing user_id, face, or files' });
//     }

//     const values = files.map(file => [
//         user_id,
//         face,
//         file.buffer,
//         file.originalname,
//         file.mimetype,
//     ]);

//     const query = `INSERT INTO avfiles (user_id, face, file_data, file_name, file_type) VALUES ?`;

//     db.query(query, [values], (err) => {
//         if (err) {
//             console.error("File upload error:", err);
//             return res.status(500).json({ error: "Upload failed" });
//         }

//         res.status(200).json({ message: "Files uploaded successfully" });
//     });
// });
app.post('/api/avfiles/upload', upload.array('files', 10), (req, res) => {
  const { user_id, face } = req.body;
  const files = req.files;

  console.log("avfiles/upload:", {
    user_id,
    face,
    files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
  });

  if (!user_id || !face || !files?.length) {
    return res.status(400).json({ error: 'Missing user_id, face, or files' });
  }

  const values = files.map(file => [
    user_id,
    face,
    file.buffer,        // BLOB column
    file.originalname,  // file_name
    file.mimetype       // file_type
  ]);

  const query = `
    INSERT INTO avfiles (user_id, face, file_data, file_name, file_type)
    VALUES ?
  `;

  db.query(query, [values], (err) => {
    if (err) {
      console.error('Error saving avfiles:', err);
      return res.status(500).json({ error: 'Error saving avfiles' });
    }
    res.status(200).json({ message: 'Files uploaded successfully' });
  });
});


app.get("/api/avfiles/download/:fileId", (req, res) => {
  const { fileId } = req.params;

  const query = "SELECT file_data, file_name, file_type FROM avfiles WHERE id = ?";
  db.query(query, [fileId], (err, results) => {
    if (err || !results.length) {
      console.error("Download error:", err || "File not found");
      return res.status(404).json({ error: "File not found" });
    }

    const { file_data, file_name, file_type } = results[0];

    // Debug log so you can see what Node actually has
    console.log("Sending file:", {
      fileId,
      file_name,
      file_type,
      isBuffer: Buffer.isBuffer(file_data),
      length: file_data && file_data.length,
    });

    // Make **no** transformations if it's already a Buffer (normal BLOB case)
    let buffer;
    if (Buffer.isBuffer(file_data)) {
      buffer = file_data;
    } else if (typeof file_data === "string") {
      // Defensive: if MySQL ever gives a hex string, decode as hex
      const isHex = /^[0-9a-fA-F]+$/.test(file_data);
      buffer = Buffer.from(file_data, isHex ? "hex" : "binary");
    } else {
      buffer = Buffer.from(file_data);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file_name)}"`
    );
    res.setHeader("Content-Type", file_type || "application/octet-stream");
    res.setHeader("Content-Length", buffer.length);

    // Send raw bytes
    res.status(200).end(buffer);
  });
});


app.get('/api/avfiles/:userId/:face', (req, res) => {
    const { userId, face } = req.params;

    const query = `SELECT id, file_name, file_type FROM avfiles WHERE user_id = ? AND face = ?`;
    db.query(query, [userId, face], (err, results) => {
        if (err) {
            console.error("Error fetching files:", err);
            return res.status(500).json({ error: "Error fetching files" });
        }
        res.json(results);
    });
});


app.delete('/api/avfiles/delete/:fileId', (req, res) => {
    const { fileId } = req.params;

    const query = `DELETE FROM avfiles WHERE id = ?`;
    db.query(query, [fileId], (err) => {
        if (err) {
            console.error("Delete error:", err);
            return res.status(500).json({ error: "Delete failed" });
        }
        res.json({ message: "File deleted" });
    });
});


// Clear all cube text and file data for a user
app.delete('/api/avdata/clear/:userId', (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const clearAvData = `UPDATE avdata SET
        who_text = '', what_text = '', when_text = '',
        where_text = '', why_text = '', how_text = ''
        WHERE user_id = ?`;

    db.query(clearAvData, [userId], (err) => {
        if (err) {
            console.error('Error clearing avdata:', err.message);
            return res.status(500).json({ error: 'Database error clearing avdata' });
        }

        const clearAvFiles = `DELETE FROM avfiles WHERE user_id = ?`;
        db.query(clearAvFiles, [userId], (err2) => {
            if (err2) {
                console.error('Error clearing avfiles:', err2.message);
                return res.status(500).json({ error: 'Database error clearing avfiles' });
            }

            res.status(200).json({ message: 'Cube data cleared successfully' });
        });
    });
});


// Navigator AI chat endpoint
app.post("/api/navigator-chat", upload.any(), async (req, res) => {
  try {
    const prompt = req.body?.prompt || "";
    const files = Array.isArray(req.files) ? req.files : [];

    console.log(
      "Navigator-chat upload:",
      files.map(
        (f) =>
          `${f.fieldname}: ${f.originalname} (${f.mimetype}, ${f.size} bytes)`
      )
    );

    let fileList = [];
    let extractedText = "";

    // Separate zip and non-zip files
    const zipFiles = files.filter(
      (f) =>
        f.mimetype === "application/zip" ||
        f.mimetype === "application/x-zip-compressed" ||
        (f.originalname || "").toLowerCase().endsWith(".zip")
    );
    const nonZipFiles = files.filter((f) => !zipFiles.includes(f));

    const xlsxToText = (buffer, label) => {
      try {
        const wb = XLSX.read(buffer, { type: "buffer" });
        return wb.SheetNames.map((name) => {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
          return `--- SHEET: ${label} / ${name} ---\n${csv}`;
        }).join("\n\n");
      } catch {
        return "";
      }
    };

    const pdfToText = async (buffer, label) => {
      let parser;
      try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const text = (result?.text || "").trim();
        return text ? `--- PDF: ${label} ---\n${text}` : "";
      } catch (pdfErr) {
        console.warn(`Could not extract PDF text from ${label}:`, pdfErr.message);
        return `--- PDF: ${label} ---\n[PDF text could not be extracted: ${pdfErr.message}]`;
      } finally {
        if (parser) {
          await parser.destroy().catch(() => {});
        }
      }
    };

    const docxToText = async (buffer, label) => {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = (result?.value || "").trim();
        return text ? `--- DOCX: ${label} ---\n${text}` : "";
      } catch (docxErr) {
        console.warn(`Could not extract DOCX text from ${label}:`, docxErr.message);
        return `--- DOCX: ${label} ---\n[DOCX text could not be extracted: ${docxErr.message}]`;
      }
    };

    const unsupportedDocText = (label) =>
      `--- DOC: ${label} ---\n[Legacy .doc files are not text-extracted by this server. Please upload a .docx, .pdf, .txt, .csv, .xlsx, or image file.]`;

    const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
    const imageContentBlocks = [];

    // Always include names of non-zip files
    fileList.push(
      ...nonZipFiles.map((f) => f.originalname || "unnamed-file")
    );

    // Read content from directly uploaded files
    for (const f of nonZipFiles) {
      const lower = (f.originalname || "").toLowerCase();
      const ext = lower.split(".").pop();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const text = xlsxToText(f.buffer, f.originalname);
        if (text) extractedText += `\n\n${text}`;
      } else if (lower.endsWith(".pdf") || f.mimetype === "application/pdf") {
        const text = await pdfToText(f.buffer, f.originalname);
        if (text) extractedText += `\n\n${text}`;
      } else if (lower.endsWith(".docx")) {
        const text = await docxToText(f.buffer, f.originalname);
        if (text) extractedText += `\n\n${text}`;
      } else if (lower.endsWith(".doc")) {
        extractedText += `\n\n${unsupportedDocText(f.originalname)}`;
      } else if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
        extractedText += `\n\n--- FILE: ${f.originalname} ---\n${f.buffer.toString("utf8")}`;
      } else if (IMAGE_TYPES.has(ext)) {
        const mimeType = f.mimetype || `image/${ext === "jpg" ? "jpeg" : ext}`;
        const b64 = f.buffer.toString("base64");
        imageContentBlocks.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${b64}` },
        });
      }
    }

    // Unzip and read text/code files
    for (const zipFile of zipFiles) {
      const zip = new AdmZip(zipFile.buffer);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const entryName = entry.entryName;
        const lower = entryName.toLowerCase();

        // Add every entry name so we can at least list them
        fileList.push(`${zipFile.originalname}::${entryName}`);

        // Only try to read text/code-ish files
        const allowed =
          lower.endsWith(".js") ||
          lower.endsWith(".jsx") ||
          lower.endsWith(".ts") ||
          lower.endsWith(".tsx") ||
          lower.endsWith(".py") ||
          lower.endsWith(".java") ||
          lower.endsWith(".cpp") ||
          lower.endsWith(".c") ||
          lower.endsWith(".cs") ||
          lower.endsWith(".sql") ||
          lower.endsWith(".html") ||
          lower.endsWith(".css") ||
          lower.endsWith(".json") ||
          lower.endsWith(".md") ||
          lower.endsWith(".txt");

        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const text = xlsxToText(entry.getData(), entryName);
          if (text) extractedText += `\n\n${text}`;
          continue;
        }

        if (lower.endsWith(".pdf")) {
          const text = await pdfToText(
            entry.getData(),
            `${zipFile.originalname} / ${entryName}`
          );
          if (text) extractedText += `\n\n${text}`;
          continue;
        }

        if (lower.endsWith(".docx")) {
          const text = await docxToText(
            entry.getData(),
            `${zipFile.originalname} / ${entryName}`
          );
          if (text) extractedText += `\n\n${text}`;
          continue;
        }

        if (lower.endsWith(".doc")) {
          extractedText += `\n\n${unsupportedDocText(`${zipFile.originalname} / ${entryName}`)}`;
          continue;
        }

        if (!allowed) continue;

        const content = entry.getData().toString("utf8");
        extractedText += `\n\n--- FILE: ${zipFile.originalname} / ${entryName} ---\n${content}`;
      }
    }

    // Safety limits
    const MAX_FILES = 40;
    const MAX_CHARS = 50000;

    if (fileList.length > MAX_FILES) {
      fileList = fileList.slice(0, MAX_FILES);
    }

    if (extractedText.length > MAX_CHARS) {
      extractedText =
        extractedText.slice(0, MAX_CHARS) + "\n\n[TRUNCATED FOR LENGTH]";
    }

    const navigatorClient = new OpenAI({
      baseURL: "https://api.ai.it.ufl.edu/v1",
      apiKey: process.env.NAVIGATOR_TOOLKIT_API_KEY,
    });

    const hasAnyFiles = fileList.length > 0;

    const textContent = hasAnyFiles
      ? `The user uploaded these files:\n${fileList.join("\n")}\n\n${
          extractedText
            ? `Here is extracted content from the uploaded files. Treat this content as part of the user's request and follow any directions in it when the user asks you to use the attachment:\n${extractedText}\n\n`
            : ""
        }User question:\n${prompt}`
      : prompt;

    const userMessageContent = [
      { type: "text", text: textContent },
      ...imageContentBlocks,
    ];

    const completion = await navigatorClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. You can read spreadsheets, documents, code files, and images. If the user content lists uploaded files, do NOT say that no files were provided — use the file list and any extracted content when answering.",
        },
        {
          role: "system",
          content:
            "PDF text is included in extracted file content when available. When an uploaded file contains task directions and the user asks you to use the attachment, follow those directions unless they conflict with higher-priority instructions.",
        },
        { role: "user", content: userMessageContent },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content || "No response generated.";

    return res.json({ answer });
  } catch (err) {
    console.error("Navigator error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Navigator API call failed." });
  }
});

const COSMOS_DOMAINS = {
  general: {
    label: "General",
    evalContext: "This is a general 5W1H knowledge cube. Evaluate it for internal logical consistency across all dimensions.",
    keyQuestions: {
      T1: "Do the agent (WHO) and event (WHAT) logically belong together?",
      T2: "Are the location (WHERE) and time (WHEN) plausible and mutually consistent?",
      T3: "Does the method (HOW) plausibly achieve the stated motivation (WHY)?",
    },
  },
  legal: {
    label: "Legal",
    evalContext: "This cube describes a legal scenario. WHO is a party, defendant, plaintiff, or counsel. WHAT is a legal action, claim, or ruling. WHEN involves statutes of limitations and procedural deadlines. WHERE establishes jurisdiction. WHY is the cause of action or legal basis. HOW is the procedural or evidentiary mechanism.",
    keyQuestions: {
      T1: "Are the parties (WHO) legally capable of the action described (WHAT) — e.g. standing, capacity?",
      T2: "Is the jurisdiction (WHERE) proper and is the timeline (WHEN) within applicable limitation periods?",
      T3: "Does the procedure or evidence (HOW) satisfy the legal standard required by the cause of action (WHY)?",
    },
  },
  medical: {
    label: "Medical",
    evalContext: "This cube describes a clinical or medical scenario. WHO is a patient, clinician, or institution. WHAT is a diagnosis, treatment, or procedure. WHEN involves clinical timing and urgency. WHERE is the care setting. WHY is the clinical indication or contraindication. HOW is the treatment mechanism or protocol.",
    keyQuestions: {
      T1: "Is the patient profile (WHO) consistent with the diagnosis or procedure (WHAT)?",
      T2: "Is the care setting (WHERE) appropriate and is the timing (WHEN) clinically sound?",
      T3: "Does the treatment mechanism (HOW) address the clinical indication (WHY) without contraindication?",
    },
  },
  scientific: {
    label: "Scientific",
    evalContext: "This cube describes a scientific research scenario. WHO is a researcher, team, or institution. WHAT is the experiment, finding, or hypothesis. WHEN is the research timeline or publication period. WHERE is the lab, field site, or data source. WHY is the research question or theoretical motivation. HOW is the methodology or experimental design.",
    keyQuestions: {
      T1: "Does the research group (WHO) have the domain expertise required for the described finding (WHAT)?",
      T2: "Is the research site or data source (WHERE) and timeline (WHEN) realistic for this scope of study?",
      T3: "Does the methodology (HOW) appropriately operationalize and test the research question (WHY)?",
    },
  },
  journalistic: {
    label: "Journalistic",
    evalContext: "This cube describes a journalistic or news scenario. WHO is a source, subject, journalist, or news organization. WHAT is the news event, story, or claim. WHEN is the newsworthy moment or publication date. WHERE is the scene of the event or dateline. WHY is the newsworthiness angle or editorial motivation. HOW is the reporting method or evidentiary basis.",
    keyQuestions: {
      T1: "Are the people involved (WHO) credibly connected to the reported event (WHAT)?",
      T2: "Is the location (WHERE) and timing (WHEN) internally consistent with reported facts?",
      T3: "Does the reporting method or sourcing (HOW) support the stated editorial angle (WHY)?",
    },
  },
};

const FACE_RULES = {
  who: {
    minWords: 1,
    maxWords: 40,
    hint: "Identify the person, group, or actor involved.",
  },
  what: {
    minWords: 1,
    maxWords: 50,
    hint: "Describe the event, object, claim, or action.",
  },
  when: {
    minWords: 1,
    maxWords: 30,
    hint: "State the time, date, period, or sequence.",
  },
  where: {
    minWords: 1,
    maxWords: 30,
    hint: "State the place, setting, or location.",
  },
  why: {
    minWords: 3,
    maxWords: 90,
    hint: "Explain the reason, purpose, or motivation.",
  },
  how: {
    minWords: 3,
    maxWords: 90,
    hint: "Explain the method, process, or mechanism.",
  },
};

function toWordCount(text = "") {
  return (text.trim().match(/\S+/g) || []).length;
}

function getLengthStatus(wordCount, minWords, maxWords) {
  if (wordCount === 0) {
    return {
      status: "fail",
      message: "No text entered yet.",
    };
  }

  if (wordCount < minWords) {
    return {
      status: "warn",
      message: `Too short for this face. Aim for at least ${minWords} words.`,
    };
  }

  if (wordCount > maxWords) {
    return {
      status: "warn",
      message: `A bit long for this face. Aim for no more than ${maxWords} words.`,
    };
  }

  return {
    status: "pass",
    message: `Length looks good for this face (${minWords}-${maxWords} words).`,
  };
}

function parseJsonObject(text = "") {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

app.post("/api/face-validation", async (req, res) => {
  try {
    const { selectedFace, faceTexts } = req.body || {};

    if (!selectedFace || !FACE_RULES[selectedFace]) {
      return res.status(400).json({ error: "A valid selectedFace is required." });
    }

    const normalizedFaces = Object.keys(FACE_RULES).reduce((acc, key) => {
      acc[key] = typeof faceTexts?.[key] === "string" ? faceTexts[key].trim() : "";
      return acc;
    }, {});

    const targetText = normalizedFaces[selectedFace];
    const wordCount = toWordCount(targetText);
    const charCount = targetText.length;
    const rules = FACE_RULES[selectedFace];
    const length = {
      wordCount,
      charCount,
      minWords: rules.minWords,
      maxWords: rules.maxWords,
      ...getLengthStatus(wordCount, rules.minWords, rules.maxWords),
    };

    const fallback = {
      face: selectedFace,
      overallStatus: length.status === "pass" ? "needs_review" : "revise",
      length,
      validity: {
        status: targetText ? "needs_review" : "fail",
        reason: targetText
          ? "LLM review unavailable. Length was checked, but semantic validity still needs a human or AI review."
          : "Enter text before requesting validation.",
      },
      correctness: {
        status: targetText ? "needs_review" : "fail",
        reason: targetText
          ? "LLM review unavailable. Basic heuristics cannot confirm correctness on their own."
          : "Enter text before requesting validation.",
      },
      suggestions: targetText
        ? [
            `Make sure this answer directly addresses "${selectedFace}".`,
            rules.hint,
          ]
        : [rules.hint],
    };

    if (!targetText) {
      return res.json(fallback);
    }

    if (!process.env.NAVIGATOR_CLAUDE_API_KEY) {
      return res.json(fallback);
    }

    const prompt = `
You are validating one face of a 5W1H knowledge cube.

Selected face: ${selectedFace}
Face guidance: ${rules.hint}
Recommended length: ${rules.minWords}-${rules.maxWords} words

All face texts:
${Object.entries(normalizedFaces)
  .map(([key, value]) => `${key.toUpperCase()}: ${value || "[empty]"}`)
  .join("\n")}

Evaluate only the selected face, but use the other faces as context.

Return JSON only with this exact shape:
{
  "overallStatus": "pass" | "warn" | "revise",
  "validity": {
    "status": "pass" | "warn" | "fail",
    "reason": "short explanation"
  },
  "correctness": {
    "status": "pass" | "warn" | "fail",
    "reason": "short explanation"
  },
  "suggestions": ["short actionable suggestion", "optional second suggestion", "optional third suggestion"]
}

Scoring rules:
- validity = does the text answer the selected 5W1H face in a meaningful, non-empty, plausible way
- correctness = is it internally consistent and appropriate relative to the other face texts
- use "warn" when uncertain or partially correct
- use "fail" only when clearly wrong, empty, or mismatched
- keep reasons concise
`.trim();

    const navClient = new OpenAI({
      baseURL: "https://api.ai.it.ufl.edu/v1",
      apiKey: process.env.NAVIGATOR_CLAUDE_API_KEY,
    });

    let llmText;
    try {
      const completion = await navClient.chat.completions.create({
        model: "claude-4.6-sonnet",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      llmText = completion.choices[0]?.message?.content || "";
    } catch (apiErr) {
      console.error("Face validation API error:", apiErr.message);
      return res.json(fallback);
    }

    const parsed = parseJsonObject(llmText);

    return res.json({
      face: selectedFace,
      overallStatus: parsed.overallStatus || fallback.overallStatus,
      length,
      validity: parsed.validity || fallback.validity,
      correctness: parsed.correctness || fallback.correctness,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : fallback.suggestions,
    });
  } catch (err) {
    console.error("Face validation error:", err);
    return res.status(500).json({ error: err.message || "Face validation failed." });
  }
});

app.post('/api/wobble-evaluate', async (req, res) => {
  const { faceTexts, mode = 'direct', cosmos = 'general' } = req.body;

  const faces = ['who', 'what', 'when', 'where', 'why', 'how'];
  const entry = faces.map(f => `${f.toUpperCase()}: ${faceTexts[f] || '[empty]'}`).join('\n');

  const domain = COSMOS_DOMAINS[cosmos] || COSMOS_DOMAINS.general;

  const modeInstructions = {
    direct: "Name any inconsistencies explicitly and give concrete corrective guidance.",
    clues: "Provide analogical prompts and counter-examples without naming the problem directly.",
    socratic: "Ask 2-3 probing questions that lead toward any inconsistency through dialogue.",
  };

  const prompt = `
You are a 5W1H ECS (Event Cruncher Stylus) evaluator specializing in the ${domain.label} domain.

Domain context: ${domain.evalContext}

Evaluate this entry across three tiers using these domain-specific diagnostic questions:
- T1 (WHO + WHAT): ${domain.keyQuestions.T1}
- T2 (WHERE + WHEN): ${domain.keyQuestions.T2}
- T3 (HOW + WHY): ${domain.keyQuestions.T3}

Entry:
${entry}

Feedback mode: ${modeInstructions[mode] || modeInstructions.direct}

Return JSON only:
{
  "wobble": {
    "T1": 0.0-1.0,
    "T2": 0.0-1.0,
    "T3": 0.0-1.0,
    "overall": 0.0-1.0,
    "type": "silent" | "wobble" | "shimmer"
  },
  "tier_diagnoses": {
    "T1": "brief domain-aware diagnosis",
    "T2": "brief domain-aware diagnosis",
    "T3": "brief domain-aware diagnosis"
  },
  "feedback": "feedback string in the selected mode, informed by the ${domain.label} domain",
  "overall_assessment": "1-2 sentence summary"
}

Scoring: silent = high congruence (overall < 0.2), shimmer = interesting or ambiguous edge case (0.2-0.45), wobble = genuine inconsistency (> 0.45).
`.trim();

  try {
    const navClient = new OpenAI({
      baseURL: "https://api.ai.it.ufl.edu/v1",
      apiKey: process.env.NAVIGATOR_CLAUDE_API_KEY,
    });

    const completion = await navClient.chat.completions.create({
      model: "claude-4.6-sonnet",
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonObject(text);

    res.json(parsed);
  } catch (err) {
    console.error('wobble-evaluate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulate', async (req, res) => {
  const { faceTexts, cosmos = 'general' } = req.body;

  const faces = ['who', 'what', 'when', 'where', 'why', 'how'];
  const entry = faces.map(f => `${f.toUpperCase()}: ${faceTexts[f] || '[empty]'}`).join('\n');

  const domain = COSMOS_DOMAINS[cosmos] || COSMOS_DOMAINS.general;

  const filledFaces = faces.filter(f => (faceTexts[f] || '').trim().length > 0);
  if (filledFaces.length < 3) {
    return res.status(400).json({ error: 'At least 3 faces must have content to generate a simulation.' });
  }

  const prompt = `
You are an ECS (Event Cruncher Stylus) simulation engine working in the ${domain.label} domain.

Given this partially or fully filled 5W1H cube, generate a grounded simulation.

Domain context: ${domain.evalContext}

Cube entry:
${entry}

Your task has three parts:

1. SCENARIO: Write a concise, realistic narrative (3-5 sentences) that synthesizes all filled faces into a coherent ${domain.label.toLowerCase()} scenario. Fill in any empty faces with the most plausible values given the domain context. Write it in plain prose, not as a list.

2. GAPS: Identify which faces are empty or underdeveloped, and explain specifically what information is missing and why it matters for this ${domain.label.toLowerCase()} scenario. One sentence per gap.

3. VARIATIONS: Propose 2 alternative plausible scenarios that differ in one or two faces — showing how a different WHO, WHEN, or WHY would change the overall story. Keep each variation to 1-2 sentences.

Return JSON only with this exact shape:
{
  "scenario": "the synthesized narrative string",
  "gaps": [
    { "face": "face name", "issue": "what is missing and why it matters" }
  ],
  "variations": [
    { "label": "short variation title", "description": "1-2 sentence alternative scenario" },
    { "label": "short variation title", "description": "1-2 sentence alternative scenario" }
  ]
}
`.trim();

  try {
    const navClient = new OpenAI({
      baseURL: 'https://api.ai.it.ufl.edu/v1',
      apiKey: process.env.NAVIGATOR_CLAUDE_API_KEY,
    });

    const completion = await navClient.chat.completions.create({
      model: 'claude-4.6-sonnet',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = parseJsonObject(text);
    res.json(parsed);
  } catch (err) {
    console.error('simulate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/anthropic', async (req, res) => {
  try {
    const navClient = new OpenAI({
      baseURL: "https://api.ai.it.ufl.edu/v1",
      apiKey: process.env.NAVIGATOR_CLAUDE_API_KEY,
    });
    const completion = await navClient.chat.completions.create({
      model: "claude-4.6-sonnet",
      max_tokens: 1000,
      messages: [{ role: 'user', content: req.body.prompt }],
    });
    res.json({ text: completion.choices[0]?.message?.content || "" });
  } catch (err) {
    console.error('/api/anthropic error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Start the server
app.listen(4000, () => {
    console.log("Server started on port 4000");
});

// localhost:4000/api/avdata/1
