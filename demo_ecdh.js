// demo_ecdh.js
// Demostración en vivo del esquema criptográfico de la tesis.
// Correr con: node demo_ecdh.js   (desde la carpeta PATRONATOBACKEND)

import { CryptoService } from './utils/cryptoService.js';

function linea() { console.log('─'.repeat(70)); }

console.log('\n=== DEMOSTRACIÓN: CIFRADO ASIMÉTRICO ECDH + FIRMA ECDSA ===\n');

// ------------------------------------------------------------------
// PASO 1: Generar dos pares de llaves.
//   - Uno representa al PATRONATO (institucional): el "destinatario"
//     de la información. Su llave PÚBLICA se usa para cifrar.
//   - Uno representa al MÉDICO: quien firma la consulta. Su llave
//     PRIVADA se usa para firmar (nunca sale de su equipo).
// ------------------------------------------------------------------
linea();
console.log('PASO 1: Generación de llaves ECC (curva P-256 / prime256v1)\n');

const institucion = CryptoService.generarClavesECC();
const medico = CryptoService.generarClavesECC();

console.log('Llave PÚBLICA institucional (esto es lo que se usa para cifrar):');
console.log(institucion.publicKey.slice(0, 120) + '...\n');
console.log('Llave PRIVADA institucional (esto es lo que se necesita para descifrar):');
console.log(institucion.privateKey.slice(0, 120) + '...\n');

// ------------------------------------------------------------------
// PASO 2: Cifrar una "historia clínica" con la llave PÚBLICA
// institucional. Cualquiera puede cifrar (la llave pública no es
// secreta), pero solo quien tenga la llave PRIVADA correspondiente
// podrá leerlo después.
// ------------------------------------------------------------------
linea();
console.log('PASO 2: Cifrado (ECDH + AES-256-GCM) con la llave pública institucional\n');

const contenidoReal = JSON.stringify({
  motivo: 'Control de presión arterial',
  diagnostico: 'Hipertensión arterial controlada',
  plan_terapeutico: 'Continuar losartán 50mg cada 24h'
});

console.log('Contenido real (lo que el médico escribió):');
console.log('  ' + contenidoReal + '\n');

const paqueteCifrado = CryptoService.cifrarConECDH(contenidoReal, institucion.publicKey);

console.log('Paquete cifrado (esto es lo que realmente se guarda en la base de datos):');
console.log('  ' + paqueteCifrado.slice(0, 200) + '...\n');
console.log('👉 Nótese: es imposible reconocer "Hipertensión" o cualquier dato real ahí.\n');

// ------------------------------------------------------------------
// PASO 3: Firmar el contenido con la llave PRIVADA del médico
// (esto NUNCA se envía al servidor; solo viaja una vez, en el
// momento de crear la consulta, para calcular la firma).
// ------------------------------------------------------------------
linea();
console.log('PASO 3: Firma digital (ECDSA/SHA-256) con la llave privada del MÉDICO\n');

const firma = CryptoService.firmarHistoriaClinica(contenidoReal, medico.privateKey);
console.log('Firma generada:');
console.log('  ' + firma.slice(0, 100) + '...\n');

// ------------------------------------------------------------------
// PASO 4: Verificar la firma con la llave PÚBLICA del médico
// (esto es lo que permite comprobar, meses después, que fue
// realmente ese médico quien escribió el registro, y que nadie
// lo alteró después).
// ------------------------------------------------------------------
linea();
console.log('PASO 4: Verificación de la firma con la llave pública del médico\n');

const firmaValida = CryptoService.verificarFirma(contenidoReal, firma, medico.publicKey);
console.log('¿La firma es válida? →', firmaValida ? '✅ SÍ (el contenido es auténtico y no fue alterado)' : '❌ NO');

// ------------------------------------------------------------------
// PASO 5: Descifrar con la llave PRIVADA institucional correcta.
// ------------------------------------------------------------------
linea();
console.log('PASO 5: Descifrado con la llave PRIVADA institucional correcta\n');

const descifrado = CryptoService.descifrarConECDH(paqueteCifrado, institucion.privateKey);
console.log('Contenido recuperado:');
console.log('  ' + descifrado + '\n');
console.log('¿Coincide con el original? →', descifrado === contenidoReal ? '✅ SÍ' : '❌ NO');

// ------------------------------------------------------------------
// PASO 6: Intentar descifrar con una llave privada INCORRECTA
// (simula un atacante, o un empleado sin autorización, con acceso
// a la base de datos pero sin la llave privada institucional real).
// ------------------------------------------------------------------
linea();
console.log('PASO 6: Intento de descifrado con una llave privada INCORRECTA\n');

const impostor = CryptoService.generarClavesECC();
try {
  CryptoService.descifrarConECDH(paqueteCifrado, impostor.privateKey);
  console.log('❌ ALERTA: se pudo descifrar sin la llave correcta (esto NO debería pasar)');
} catch (e) {
  console.log('✅ Correcto: el sistema rechazó el intento →', e.message);
}

// ------------------------------------------------------------------
// PASO 7: Simular manipulación del paquete cifrado (un atacante
// que modifica directamente el dato en la base de datos).
// ------------------------------------------------------------------
linea();
console.log('PASO 7: Intento de descifrado tras manipular el paquete cifrado\n');

const paqueteManipulado = JSON.parse(paqueteCifrado);
paqueteManipulado.datos = paqueteManipulado.datos.slice(0, -4) + '0000'; // se altera el final
try {
  CryptoService.descifrarConECDH(JSON.stringify(paqueteManipulado), institucion.privateKey);
  console.log('❌ ALERTA: se descifró un paquete manipulado (esto NO debería pasar)');
} catch (e) {
  console.log('✅ Correcto: AES-256-GCM detectó la manipulación (authTag inválido) →', e.message);
}

// ------------------------------------------------------------------
// PASO 8: Rendimiento
// ------------------------------------------------------------------
linea();
console.log('PASO 8: Rendimiento\n');
console.log(CryptoService.benchmark());

linea();
console.log('\n=== FIN DE LA DEMOSTRACIÓN ===\n');
