import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export function verificarToken(req, res, next) {
  // 1. Extraer el header de autorización
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Separar 'Bearer' del token

  if (!token) {
    return res.status(401).json({
      code: "401",
      message: "Acceso denegado. Token no proporcionado o formato inválido.",
    });
  }

  try {
    let llaveVerificacion;

    // 2. Cargar la llave pública ECC auténtica del Municipio en producción
    if (process.env.ECC_PUBLIC_KEY_PATH) {
      const rutaLlave = path.resolve(process.env.ECC_PUBLIC_KEY_PATH);
      llaveVerificacion = fs.readFileSync(rutaLlave, "utf8");
    } else {
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurado en el servidor.");
      }
      llaveVerificacion = process.env.JWT_SECRET;
    }

    // 3. Verificar el token con soporte estricto para Curvas Elípticas (ES256) y simétrico (HS256)
    const verificado = jwt.verify(token, llaveVerificacion, {
      algorithms: ["ES256", "HS256"],
    });

    // 4. Inyectar los datos del usuario procesado en la petición
    req.user = verificado;
    next();
  } catch (error) {
    console.error("Error en verificación de token ECC:", error.message);
    return res.status(403).json({
      code: "403",
      message: "Token inválido, alterado o expirado. Permiso denegado.",
    });
  }
}
