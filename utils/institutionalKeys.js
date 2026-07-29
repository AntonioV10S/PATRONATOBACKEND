import fs from "fs";
import path from "path";

/**
 * Llaves ECC institucionales: se usan como "destinatario" en el cifrado
 * ECDH de la confidencialidad de las historias clínicas (contenido_cifrado_mg/rf).
 *
 * IMPORTANTE: la llave PRIVADA nunca se guarda en la base de datos ni se
 * expone por la API. Vive únicamente como archivo en el servidor, referenciado
 * por variables de entorno. La llave pública sí puede (y debe) quedar
 * registrada en la tabla `llaves_ecc` para trazabilidad.
 *
 * Variables de entorno esperadas:
 *   ECC_INSTITUCIONAL_PUBLICA_PATH  -> ruta al archivo .pem de la llave pública
 *   ECC_INSTITUCIONAL_PRIVADA_PATH  -> ruta al archivo .pem de la llave privada
 *
 * Genera el par con: node scripts/generarLlaveInstitucional.js
 */

function leerArchivoPem(envVar) {
  const ruta = process.env[envVar];
  if (!ruta) {
    throw new Error(
      `Falta configurar ${envVar} en el archivo .env (ruta a la llave ECC institucional).`,
    );
  }
  const rutaAbsoluta = path.resolve(ruta);
  if (!fs.existsSync(rutaAbsoluta)) {
    throw new Error(
      `No se encontró el archivo de llave institucional en: ${rutaAbsoluta}. Ejecute scripts/generarLlaveInstitucional.js primero.`,
    );
  }
  return fs.readFileSync(rutaAbsoluta, "utf8");
}

export function obtenerLlavePublicaInstitucional() {
  return leerArchivoPem("ECC_INSTITUCIONAL_PUBLICA_PATH");
}

export function obtenerLlavePrivadaInstitucional() {
  return leerArchivoPem("ECC_INSTITUCIONAL_PRIVADA_PATH");
}
