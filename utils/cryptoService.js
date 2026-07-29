import crypto from "crypto";
import { performance } from "perf_hooks";

/**
 * Servicio criptográfico del sistema.
 *
 * Confidencialidad: esquema híbrido ECDH + AES-256-GCM (tipo ECIES).
 *   - Se genera un par de llaves EFÍMERO por cada operación de cifrado.
 *   - Se deriva un secreto compartido (ECDH) entre la llave privada efímera
 *     y la llave PÚBLICA del destinatario.
 *   - Ese secreto se pasa por HKDF para obtener una clave AES-256.
 *   - El texto se cifra con AES-256-GCM usando esa clave derivada.
 *   - Solo quien posea la llave PRIVADA del destinatario puede repetir el
 *     ECDH y por lo tanto descifrar. La llave privada nunca viaja ni se
 *     guarda junto al criptograma.
 *
 * Integridad / autenticidad: firma ECDSA (SHA-256) sobre curva P-256.
 */
export class CryptoService {
  static CURVA = "prime256v1";

  // --- 1. GENERACIÓN DE LLAVES ASIMÉTRICAS (ECC - CURVA ELÍPTICA) ---
  static generarClavesECC() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: this.CURVA,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return { privateKey, publicKey };
  }

  // --- 2. FIRMA DIGITAL ECDSA (INMUTABILIDAD / NO REPUDIO) ---
  static firmarHistoriaClinica(datos, llavePrivadaPem) {
    const sign = crypto.createSign("SHA256");
    const dataStr =
      typeof datos === "string" ? datos : JSON.stringify(this.#ordenarObjeto(datos));
    sign.update(dataStr);
    sign.end();
    return sign.sign(llavePrivadaPem, "hex");
  }

  static verificarFirma(datos, firmaHex, llavePublicaPem) {
    try {
      const verify = crypto.createVerify("SHA256");
      const dataStr =
        typeof datos === "string" ? datos : JSON.stringify(this.#ordenarObjeto(datos));
      verify.update(dataStr);
      verify.end();
      return verify.verify(llavePublicaPem, firmaHex, "hex");
    } catch (error) {
      console.error("Error en verificación criptográfica estructural:", error.message);
      return false;
    }
  }

  // --- 3. INTEGRIDAD REFERENCIAL (HASHING) ---
  static calcularHashSHA256(texto) {
    return crypto.createHash("sha256").update(String(texto)).digest("hex");
  }

  // --- 4. CIFRADO ASIMÉTRICO HÍBRIDO (ECDH + AES-256-GCM) ---
  /**
   * Cifra texto plano para que SOLO el dueño de `llavePublicaDestinoPem`
   * (mediante su llave privada correspondiente) pueda descifrarlo.
   */
  static cifrarConECDH(textoPlano, llavePublicaDestinoPem) {
    // 1. Par de llaves efímero (uno distinto por cada cifrado)
    const efimero = crypto.generateKeyPairSync("ec", {
      namedCurve: this.CURVA,
    });

    // 2. Acuerdo de secreto compartido ECDH
    const secretoCompartido = crypto.diffieHellman({
      privateKey: efimero.privateKey,
      publicKey: crypto.createPublicKey(llavePublicaDestinoPem),
    });

    // 3. Derivación de clave AES-256 con HKDF (no usar el secreto crudo)
    const claveAES = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        secretoCompartido,
        Buffer.alloc(0),
        Buffer.from("historia-clinica-gad-junin"),
        32,
      ),
    );

    // 4. Cifrado simétrico autenticado del contenido real
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", claveAES, iv);
    let encriptado = cipher.update(textoPlano, "utf8", "hex");
    encriptado += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const pubEfimeraPem = efimero.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    // 5. Empaquetado autocontenido (todo lo necesario para descifrar,
    //    EXCEPTO la llave privada del destinatario, que nunca se incluye)
    return JSON.stringify({
      v: 1,
      alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
      pubEfimera: pubEfimeraPem,
      iv: iv.toString("hex"),
      authTag,
      datos: encriptado,
    });
  }

  /**
   * Descifra un paquete generado por cifrarConECDH.
   * Requiere la llave PRIVADA del destinatario original.
   */
  static descifrarConECDH(paqueteJson, llavePrivadaDestinoPem) {
    try {
      const paquete =
        typeof paqueteJson === "string" ? JSON.parse(paqueteJson) : paqueteJson;
      const { pubEfimera, iv, authTag, datos } = paquete;

      const secretoCompartido = crypto.diffieHellman({
        privateKey: crypto.createPrivateKey(llavePrivadaDestinoPem),
        publicKey: crypto.createPublicKey(pubEfimera),
      });

      const claveAES = Buffer.from(
        crypto.hkdfSync(
          "sha256",
          secretoCompartido,
          Buffer.alloc(0),
          Buffer.from("historia-clinica-gad-junin"),
          32,
        ),
      );

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        claveAES,
        Buffer.from(iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let desencriptado = decipher.update(datos, "hex", "utf8");
      desencriptado += decipher.final("utf8");
      return desencriptado;
    } catch (error) {
      throw new Error(
        "Fallo al descifrar: paquete comprometido, manipulado o llave privada incorrecta.",
      );
    }
  }

  // --- 5. CIFRADO SIMÉTRICO DIRECTO (uso interno / campos sueltos, ej. cédula) ---
  // Se mantiene disponible para casos donde no aplica un destinatario asimétrico
  // específico (ej. campos de contacto del paciente), protegidos con una clave
  // maestra del servidor. La confidencialidad de la HISTORIA CLÍNICA en sí usa
  // siempre cifrarConECDH/descifrarConECDH (arriba), no este método.
  static cifrarDatos(textoPlano, claveSecreta) {
    if (!claveSecreta) {
      throw new Error("Se requiere una clave secreta para cifrar.");
    }
    const iv = crypto.randomBytes(12);
    const key = crypto.hkdfSync(
      "sha256",
      Buffer.from(String(claveSecreta)),
      Buffer.alloc(0),
      Buffer.from("campo-simetrico-gad-junin"),
      32,
    );
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key), iv);

    let encriptado = cipher.update(textoPlano, "utf8", "hex");
    encriptado += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encriptado}`;
  }

  static descifrarDatos(paqueteCifrado, claveSecreta) {
    try {
      const [ivHex, authTagHex, encriptado] = paqueteCifrado.split(":");
      const key = crypto.hkdfSync(
        "sha256",
        Buffer.from(String(claveSecreta)),
        Buffer.alloc(0),
        Buffer.from("campo-simetrico-gad-junin"),
        32,
      );

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        Buffer.from(key),
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

      let desencriptado = decipher.update(encriptado, "hex", "utf8");
      desencriptado += decipher.final("utf8");
      return desencriptado;
    } catch (error) {
      throw new Error(
        "Fallo al descifrar: carga útil comprometida, manipulada o clave inválida.",
      );
    }
  }

  // --- 6. ÍNDICE CIEGO (búsqueda exacta sobre campos cifrados) ---
  // AES-GCM usa IV aleatorio -> el mismo texto nunca produce el mismo
  // criptograma dos veces, por lo que no se puede hacer WHERE = directamente
  // sobre una columna *_enc. Este HMAC es determinista (mismo texto -> mismo
  // hash) pero no reversible, así que sirve como índice de búsqueda sin
  // exponer el dato original.
  static calcularIndiceCiego(texto, claveSecreta) {
    const valorNormalizado = String(texto).trim().toLowerCase();
    return crypto
      .createHmac("sha256", String(claveSecreta))
      .update(valorNormalizado)
      .digest("hex");
  }

  // --- 7. MÉTRICAS DE RENDIMIENTO ---
  static benchmark() {
    const data = "Consulta Médica Estándar - GAD Junín - Registro de Prueba";
    const { publicKey, privateKey } = this.generarClavesECC();
    const inicio = performance.now();

    for (let i = 0; i < 100; i++) {
      this.cifrarConECDH(data, publicKey);
    }

    const fin = performance.now();
    const promedio = (fin - inicio) / 100;
    void privateKey;
    return `Análisis de rendimiento institucional (ECDH+AES-256-GCM): ${promedio.toFixed(4)} ms por operación de cifrado.`;
  }

  // --- UTILITARIO PRIVADO: orden recursivo de claves para firmas estables ---
  static #ordenarObjeto(datos) {
    if (Array.isArray(datos)) {
      return datos.map((item) => this.#ordenarObjeto(item));
    }
    if (datos && typeof datos === "object") {
      return Object.keys(datos)
        .sort()
        .reduce((obj, key) => {
          obj[key] = this.#ordenarObjeto(datos[key]);
          return obj;
        }, {});
    }
    return datos;
  }
}
