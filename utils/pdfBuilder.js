import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_JUNIN = path.join(__dirname, '..', 'assets', 'LogoJunin.jpg');
const LOGO_PATRONATO = path.join(__dirname, '..', 'assets', 'LogoPatronato.jpg');

const VERDE_INSTITUCIONAL = '#1e5d10';

/**
 * Crea un documento PDF A4 apaisado (landscape) con el membrete institucional
 * (logos del GAD Junín y del Patronato) y un título, replicando el diseño
 * de los reportes originales en PHP/Blade.
 */
export function crearDocumentoConMembrete({ titulo, orientacion = 'landscape', tamano = 'A4' }) {
    const doc = new PDFDocument({
        size: tamano,
        layout: orientacion,
        margins: { top: 20, bottom: 20, left: 28, right: 28 }
    });

    try {
        doc.image(LOGO_JUNIN, doc.page.margins.left, 15, { height: 55 });
    } catch (e) { /* si falta la imagen, continuar sin membrete */ }
    try {
        const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        doc.image(LOGO_PATRONATO, doc.page.margins.left + anchoUtil - 70, 15, { height: 45 });
    } catch (e) { /* idem */ }

    doc.moveDown(3);
    doc.fontSize(11).fillColor('black').font('Helvetica-Bold')
        .text(titulo, doc.page.margins.left, 75, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: 'center'
        });

    return doc;
}

/**
 * Dibuja una tabla simple con columnas de ancho fijo. `filas` es un array de
 * arrays de celdas: { texto, negrita, colspan, align, color }.
 * Devuelve la posición Y final tras dibujar la tabla.
 */
export function dibujarTabla(doc, { x, y, anchoColumnas, alturaFila = 20, filas }) {
    let curY = y;

    for (const fila of filas) {
        let curX = x;
        const alturaEstaFila = fila.altura || alturaFila;

        let colIndex = 0;
        for (const celda of fila.celdas) {
            const span = celda.colspan || 1;
            let ancho = 0;
            for (let i = 0; i < span; i++) {
                ancho += anchoColumnas[colIndex + i] || anchoColumnas[anchoColumnas.length - 1];
            }

            doc.rect(curX, curY, ancho, alturaEstaFila).stroke();

            doc.fontSize(celda.fontSize || 9)
                .font(celda.negrita === false ? 'Helvetica' : 'Helvetica-Bold')
                .fillColor(celda.color || 'black')
                .text(celda.texto !== undefined && celda.texto !== null ? String(celda.texto) : '', curX + 2, curY + (alturaEstaFila / 2 - 5), {
                    width: ancho - 4,
                    align: celda.align || 'center'
                });

            curX += ancho;
            colIndex += span;
        }
        curY += alturaEstaFila;
    }

    return curY;
}

/**
 * Dibuja una celda con texto rotado 270° (de abajo hacia arriba), útil para
 * encabezados angostos de formularios densos tipo MSP.
 */
export function dibujarCeldaRotada(doc, { x, y, w, h, texto, fontSize = 6 }) {
    doc.rect(x, y, w, h).stroke();
    doc.save();
    doc.fontSize(fontSize).font('Helvetica-Bold').fillColor(COLOR_VERDE);
    doc.rotate(-90, { origin: [x + w / 2, y + h / 2] });
    doc.text(texto, x + w / 2 - h / 2, y + h / 2 - 3, {
        width: h,
        align: 'center'
    });
    doc.restore();
}

/** Dibuja una celda normal (sin rotar), reutilizable fuera de dibujarTabla. */
export function dibujarCelda(doc, { x, y, w, h, texto, fontSize = 7, negrita = true, color = 'black', align = 'center' }) {
    doc.rect(x, y, w, h).stroke();
    doc.fontSize(fontSize).font(negrita ? 'Helvetica-Bold' : 'Helvetica').fillColor(color)
        .text(texto !== undefined && texto !== null ? String(texto) : '', x + 1, y + h / 2 - fontSize / 2, {
            width: w - 2,
            align
        });
}

export function nombreDelMes(numeroMes) {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO",
        "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    return meses[parseInt(numeroMes, 10) - 1] || "";
}

export const COLOR_VERDE = VERDE_INSTITUCIONAL;
