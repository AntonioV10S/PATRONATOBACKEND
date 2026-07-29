import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CryptoService } from "../utils/cryptoService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaLlaves = path.join(__dirname, "..", "keys");

if (!fs.existsSync(carpetaLlaves)) {
  fs.mkdirSync(carpetaLlaves, { recursive: true });
}

const rutaPublica = path.join(carpetaLlaves, "institucional_public.pem");
const rutaPrivada = path.join(carpetaLlaves, "institucional_private.pem");

if (fs.existsSync(rutaPrivada)) {
  console.error(
    `Ya existe una llave privada institucional en ${rutaPrivada}. ` +
      `Este script no la sobrescribe para evitar perder acceso a historias ya cifradas. ` +
      `Elimínela manualmente solo si sabe lo que hace.`,
  );
  process.exit(1);
}

const { publicKey, privateKey } = CryptoService.generarClavesECC();

fs.writeFileSync(rutaPublica, publicKey, { mode: 0o644 });
fs.writeFileSync(rutaPrivada, privateKey, { mode: 0o600 });

console.log("Par de llaves ECC institucional generado correctamente.");
console.log(`  Pública : ${rutaPublica}`);
console.log(`  Privada : ${rutaPrivada}  (permisos 600, NO subir a git)`);
console.log("");
console.log("Agregue esto a su archivo .env:");
console.log(`ECC_INSTITUCIONAL_PUBLICA_PATH=./keys/institucional_public.pem`);
console.log(`ECC_INSTITUCIONAL_PRIVADA_PATH=./keys/institucional_private.pem`);
console.log("");
console.log(
  "Recuerde también insertar la llave pública en la tabla llaves_ecc para trazabilidad.",
);
