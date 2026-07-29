import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ApiRouter } from './Routes/api.js'; 
import { sequelize } from './db/conexion.js';
import { verificarToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. SEGURIDAD Y MIDDLEWARES ---
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Demasiadas peticiones, intente más tarde." }
});
app.use('/api/', limiter);

// --- 2. CONFIGURACIÓN DE CARPETAS Y MULTER ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

// --- 3. RUTAS ---

// Subida de archivos (Ej: Fotos de pacientes o exámenes) - requiere sesión válida
app.post('/api/upload', verificarToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  res.json({ message: 'Archivo subido', fileId: req.file.filename });
});

// Endpoint seguro para servir archivos - requiere sesión válida y nombre saneado
app.get('/api/files/:filename', verificarToken, (req, res) => {
  const nombreSeguro = path.basename(req.params.filename); // evita path traversal (../)
  const filePath = path.join(uploadDir, nombreSeguro);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' });
  }
});

// Rutas de la API (Carga todos los controladores)
app.use('/api', ApiRouter);

// --- 4. CONEXIÓN A BASE DE DATOS ---
sequelize.authenticate()
  .then(() => console.log("Conexión a la base de datos establecida correctamente."))
  .catch((error) => console.error("Error de conexión a la DB:", error));

// --- 5. MIDDLEWARE DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Error en la subida del archivo', error: err.message });
  }
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// --- 6. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor GAD Junín corriendo en: http://localhost:${PORT}`);
});