import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Inicialización segura del contexto de rutas en entornos basados en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Establecimiento de la ruta destino absoluta para el repositorio físico de imágenes
const uploadPath = path.join(__dirname, '../uploads');

// Verificación y aprovisionamiento automático del directorio en el servidor de archivos
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Filtro de Seguridad Perimetral: Restricción estricta de MIME-Types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo inválido. Solo se admiten imágenes en formato JPG, PNG o GIF.'), false);
  }
};

// Configuración del Motor de Almacenamiento en Disco (DiskStorage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Ofuscación y construcción de nombres únicos para evitar colisiones en el sistema de archivos
    const timestamp = Date.now();
    const numeroAleatorio = Math.round(Math.random() * 1000);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${numeroAleatorio}${extension}`);
  }
});

// Exportación del componente Multer instanciado listo para inyección en Capa de Enrutamiento
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Control de cuota: Máximo 10MB por archivo cargado
  },
  fileFilter
});