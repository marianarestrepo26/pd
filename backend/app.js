import csv from "csv-parser";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import multer from "multer";

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

let db;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: "buqmvmotcmucjf1goqvq-mysql.services.clever-cloud.com",
      port: 3306,
      user: "uisa9wgrbwmpvmcv",
      password: "0x7uddRn9YWwW0PQDhoV",
      database: "buqmvmotcmucjf1goqvq",
    });
    console.log("Database connection established");
    return db;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error; // Propaga el error para manejarlo fuera
  }
}

// CRUD FOR THE BILL TABLE
app.get("/bill", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id_bill AS ID,
        b.period AS Period,
        b.invoiced_amount AS Invoiced_Amount,
        t.id_transaction AS Transaction,
        c.name AS Name_Costomer,
        c.last_name AS Last_Name,
        p.platform_name AS Platform,
        s.status AS Status
      FROM bill b
      INNER JOIN transaction t ON b.id_transaction = t.id_transaction
      INNER JOIN customer c ON b.id_costomer = c.id_costomer
      INNER JOIN platform p ON b.id_platform = p.id_platform
      INNER JOIN status s ON b.id_status = s.id_status;
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getting bills:", error);
    res.status(500).json({ success: false, error: "Error getting bills" });
  }
});

app.get("/bill/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT 
        b.id_bill AS ID,
        b.period AS Period,
        b.invoiced_amount AS Invoiced_Amount,
        t.id_transaction AS Transaction,
        c.name AS Name_Costomer,
        c.last_name AS Last_Name,
        p.platform_name AS Platform,
        s.status AS Status
      FROM bill b
      INNER JOIN transaction t ON b.id_transaction = t.id_transaction
      INNER JOIN customer c ON b.id_costomer = c.id_costomer
      INNER JOIN platform p ON b.id_platform = p.id_platform
      INNER JOIN status s ON b.id_status = s.id_status
      WHERE b.id_bill = ?
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Bill not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error getting bill:", error);
    res.status(500).json({ success: false, error: "Error getting bill" });
  }
});

app.post("/bill", async (req, res) => {
  try {
    const { id_bill, period, invoiced_amount, paid_amount, id_transaction, id_costomer, id_platform, id_status } = req.body;
    if (!id_bill || !period || !invoiced_amount || !paid_amount || !id_transaction || !id_platform) {
      return res.status(400).json({ success: false, error: "All data is required" });
    }
    const [result] = await db.query(
      "INSERT INTO bill (id_bill, period, invoiced_amount, paid_amount, id_transaction, id_costomer, id_platform, id_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id_bill, period, invoiced_amount, paid_amount, id_transaction, id_costomer || '', id_platform, id_status || 'Pending']
    );
    res.status(201).json({ success: true, message: "Bill created successfully", id: result.insertId });
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ success: false, error: "Error creating bill" });
  }
});

app.put("/bill/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { id_bill, period, invoiced_amount, paid_amount, id_transaction, id_costomer, id_platform, id_status } = req.body;
    const [result] = await db.query(
      "UPDATE bill SET id_bill = ?, period = ?, invoiced_amount = ?, paid_amount = ?, id_transaction = ?, id_costomer = ?, id_platform = ?, id_status = ? WHERE id_bill = ?",
      [id_bill, period, invoiced_amount, paid_amount, id_transaction, id_costomer, id_platform, id_status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Bill not found" });
    }
    res.json({ success: true, message: "Bill updated successfully" });
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ success: false, error: "Error updating bill" });
  }
});

app.delete("/bill/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM bill WHERE id_bill = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Bill not found" });
    }
    res.json({ success: true, message: "Bill successfully deleted" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ success: false, error: "Error deleting bill" });
  }
});

// CARGA DE ARCHIVOS
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("uploads/")) {
      fs.mkdirSync("uploads/");
    }
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".csv");
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    filePath = req.file.path;
    const tableName = req.body.tabla || "bill";

    const [tables] = await db.query(`SHOW TABLES LIKE ?`, [tableName]);
    if (tables.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, error: `Table "${tableName}" does not exist` });
    }

    const rows = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => rows.push(row))
        .on("end", () => {
          if (rows.length === 0) {
            reject(new Error("The CSV file is empty"));
          }
          resolve();
        })
        .on("error", (error) => {
          reject(new Error(`Error reading file: ${error.message}`));
        });
    });

    const originalColumns = Object.keys(rows[0]);
    const cleanColumns = originalColumns.map((col) => col.trim().replace(/\s+/g, "_").toLowerCase());

    const valoresParaInsertar = rows.map((row) =>
      cleanColumns.map((col, i) => row[originalColumns[i]])
    );

    if (valoresParaInsertar.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: "El archivo CSV no contiene datos válidos.",
      });
    }

    const placeholders = "(" + cleanColumns.map(() => "?").join(",") + ")";
    const sql = `
      INSERT INTO \`${tableName}\` (${cleanColumns.map((col) => `\`${col}\``).join(",")})
      VALUES ${valoresParaInsertar.map(() => placeholders).join(",")}
      ON DUPLICATE KEY UPDATE ${cleanColumns.map((col) => `\`${col}\` = VALUES(\`${col}\`)`).join(",")}
    `;

    await db.query(sql, valoresParaInsertar.flat());
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `${rows.length} records updated in the table "${tableName}"`,
      records: rows.length,
    });
  } catch (error) {
    console.error("Error processing CSV:", error);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({
      success: false,
      error: error.message || "Error processing CSV:",
    });
  }
});

// CONSULTAS AVANZADAS
app.get("/bill/filter", async (req, res) => {
  try {
    const { id_costomer, fecha_inicio, fecha_fin } = req.query;
    let sql = `
      SELECT 
        b.id_bill AS ID,
        b.period AS Period,
        b.invoiced_amount AS Invoiced_Amount,
        t.id_transaction AS Transaction,
        c.name AS Name_Costomer,
        c.last_name AS Last_Name,
        p.platform_name AS Platform,
        s.status AS Status
      FROM bill b
      INNER JOIN transaction t ON b.id_transaction = t.id_transaction
      INNER JOIN customer c ON b.id_costomer = c.id_costomer
      INNER JOIN platform p ON b.id_platform = p.id_platform
      INNER JOIN status s ON b.id_status = s.id_status
    `;
    const params = [];
    if (id_costomer) {
      sql += " WHERE b.id_costomer = ? ";
      params.push(id_costomer);
    }
    if (fecha_inicio && fecha_fin) {
      sql += params.length ? " AND b.period BETWEEN ? AND ?" : " WHERE b.period BETWEEN ? AND ?";
      params.push(fecha_inicio, fecha_fin);
    } else if (fecha_inicio) {
      sql += params.length ? " AND b.period >= ?" : " WHERE b.period >= ?";
      params.push(fecha_inicio);
    } else if (fecha_fin) {
      sql += params.length ? " AND b.period <= ?" : " WHERE b.period <= ?";
      params.push(fecha_fin);
    }
    sql += " ORDER BY b.id_costomer DESC";
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error filtering bills:", error);
    res.status(500).json({ success: false, error: "Error filtering bills" });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
  });