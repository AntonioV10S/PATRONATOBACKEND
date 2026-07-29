import { HistoriaClinicaMGModel } from '../Models/historiaclinicamg.js';
import { HistoriaClinicaRFModel } from "../Models/historiaclicarf.js";
import { PacienteModel } from '../Models/paciente.js';
import { ParametroModel } from '../Models/parametro.js';
import { EnfermedadModel } from '../Models/enfermedad.js';
import { RecaudacionModel } from '../Models/recaudacion.js';
import { EntregaModel } from '../Models/entrega.js';
import { DiagnosticoModel } from '../Models/diagnostico.js';
import { TratamientoModel } from '../Models/tratamiento.js';
import { RolModel } from '../Models/rol.js';
import { EgresoModel } from '../Models/egreso.js';
import { DetalleEntregaModel } from '../Models/detalleentrega.js';
import { MedicamentoModel } from '../Models/medicamento.js';
import { CryptoService } from '../utils/cryptoService.js';
import { sequelize } from '../db/conexion.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { Op } from 'sequelize';
import { crearDocumentoConMembrete, dibujarTabla, dibujarCelda, dibujarCeldaRotada, nombreDelMes, COLOR_VERDE } from '../utils/pdfBuilder.js';

// Helper: cuenta registros según filtro y responde con el formato esperado por Angular
function respuestaValidacion(res, ndatos) {
    if (ndatos > 0) {
        return res.json({ result: "Registro encontrado", code: '201' });
    }
    return res.json({ result: "Registro no encontrado", code: '202' });
}

// Receta de farmacia (entrega de medicamentos): overlay sobre uno de los 4
// fondos institucionales preimpresos, según receta_color (aleatorio en recetafinal).
function generarRecetaFarmacia(res, { entrega, medicamentos, colorFijo }) {
    const p = entrega.paciente || {};
    const fondo = path.join(__dirname, '..', 'assets', `fondoreceta${colorFijo}.jpeg`);

    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=recetapdf.pdf`);
    doc.pipe(res);

    try { doc.image(fondo, 0, 0, { width: doc.page.width, height: doc.page.height }); } catch (e) { /* sin fondo si falta el archivo */ }

    doc.fontSize(9).font('Helvetica').fillColor('black');
    doc.text(`${p.nombres || ''} ${p.apellidos || ''}`.trim(), 62, 76);
    doc.text(String(entrega.peso ?? ''), 45, 92);
    doc.text(String(entrega.talla ?? ''), 113, 92);
    doc.text(String(entrega.ta ?? ''), 172, 92);
    doc.text(String(p.edad ?? ''), 238, 92);
    doc.text(entrega.Fechaentrega ? String(entrega.Fechaentrega) : '', 62, 108);

    let y = 135;
    let linea = 1;
    medicamentos.forEach((m) => {
        const nombreMed = m.id_medicamento !== null
            ? (m.medicamento?.nombre || '')
            : (m.medicinasinrg || '');
        const primeraPalabra = (nombreMed.split(' ')[0] || '');

        doc.font('Helvetica-Bold').text(`${linea})`, 15, y, { continued: true })
            .font('Helvetica').text(` ${nombreMed}  #${m.cantidadmedicamentos ?? ''}`, { width: 260 });
        doc.font('Helvetica-Bold').text(`${linea})`, 320, y, { continued: true })
            .font('Helvetica').text(` ${primeraPalabra}: ${m.indicaciones || ''}`, { width: 250 });
        y += 16;
        linea++;
    });

    doc.end();
}

// Reporte de recaudación diaria (MG o RF): lista de pacientes con la tarifa cobrada marcada.
function generarReporteRecaudacionDiaria(res, { datos, clave, valorTexto1, valorTexto2, titulo, fecha }) {
    const doc = crearDocumentoConMembrete({
        titulo: `${titulo}\nFecha: ${fecha}`,
        orientacion: 'landscape',
        tamano: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=RecaudacionDiaria-${fecha}.pdf`);
    doc.pipe(res);

    const x0 = doc.page.margins.left;
    const anchoColumnas = [30, 220, 90, 90, 90, 220];
    const filasTabla = [
        {
            altura: 18,
            celdas: [
                { texto: 'N°' }, { texto: 'PACIENTE' }, { texto: `TARIFA ${valorTexto1}` },
                { texto: `TARIFA ${valorTexto2}` }, { texto: 'EXONERADO' }, { texto: 'OBSERVACIÓN' }
            ]
        }
    ];

    datos.forEach((item, i) => {
        const p = item.paciente || {};
        let valorNum = null;
        try { valorNum = parseFloat(CryptoService.descifrarDatos(item.valor_enc, clave)); } catch (e) { /* no se pudo descifrar */ }

        filasTabla.push({
            celdas: [
                { texto: i + 1, negrita: false },
                { texto: `${p.nombres || ''} ${p.apellidos || ''}`.trim(), negrita: false, align: 'left' },
                { texto: valorNum === parseFloat(valorTexto1) ? 'X' : '', negrita: false },
                { texto: valorNum === parseFloat(valorTexto2) ? 'X' : '', negrita: false },
                { texto: item.exonera ? 'X' : '', negrita: false },
                { texto: item.observaciones === '*' ? '' : (item.observaciones || ''), negrita: false, align: 'left', fontSize: 7 }
            ]
        });
    });

    dibujarTabla(doc, { x: x0, y: 100, anchoColumnas, alturaFila: 16, filas: filasTabla });
    doc.end();
}

// Reporte simple compartido por MG y RF: N°, paciente, motivo/diagnóstico, edad.
function generarReporteLugarAtencion(res, { filas, lugar, desde, hasta, subtitulo }) {
    const doc = crearDocumentoConMembrete({
        titulo: `REPORTE POR LUGAR DE ATENCIÓN - ${subtitulo}\n${lugar}`,
        orientacion: 'landscape',
        tamano: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Reporte_Lugar_Atencion.pdf`);
    doc.pipe(res);

    const x0 = doc.page.margins.left;
    doc.fontSize(9).font('Helvetica').fillColor('black')
        .text(`Provincia: Manabí      Desde: ${desde}      Hasta: ${hasta}`, x0, 95);

    const anchoColumnas = [40, 260, 340, 60];
    const filasTabla = [
        {
            altura: 18,
            celdas: [
                { texto: 'N°' }, { texto: 'PACIENTE' }, { texto: 'MOTIVO / DIAGNÓSTICO' }, { texto: 'EDAD' }
            ]
        }
    ];
    filas.forEach((f, i) => {
        filasTabla.push({
            celdas: [
                { texto: i + 1, negrita: false },
                { texto: f.nombre, negrita: false, align: 'left' },
                { texto: f.motivo, negrita: false, align: 'left' },
                { texto: f.edad, negrita: false }
            ]
        });
    });

    dibujarTabla(doc, { x: x0, y: 115, anchoColumnas, alturaFila: 16, filas: filasTabla });
    doc.end();
}

export const PDFController = {

    // ===== VALIDACIONES (chequeo previo antes de abrir la pestaña del PDF real) =====

    validarReportePacientesAnual: async (req, res) => {
        try {
            const { year } = req.params;
            const countMG = await HistoriaClinicaMGModel.count({
                where: sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
            });
            const countRF = await HistoriaClinicaRFModel.count({
                where: sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
            });
            return respuestaValidacion(res, countMG + countRF);
        } catch (error) {
            res.status(500).json({ message: "Error al validar reporte anual", error: error.message });
        }
    },

    validarReportePacientesMensual: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const where = {
                [Op.and]: [
                    sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                    sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                ]
            };
            const countMG = await HistoriaClinicaMGModel.count({ where });
            const countRF = await HistoriaClinicaRFModel.count({ where });
            return respuestaValidacion(res, countMG + countRF);
        } catch (error) {
            res.status(500).json({ message: "Error al validar reporte mensual", error: error.message });
        }
    },

    validarMorbilidadMedicinaGeneral: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const count = await HistoriaClinicaMGModel.count({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar morbilidad", error: error.message });
        }
    },

    validarMorbilidadTerapia: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const count = await HistoriaClinicaRFModel.count({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar morbilidad de terapia", error: error.message });
        }
    },

    validarRegistroDiarioMedicina: async (req, res) => {
        try {
            const { fecha } = req.params;
            const count = await HistoriaClinicaMGModel.count({ where: { fecha } });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar registro diario", error: error.message });
        }
    },

    validarRegistroDiarioFisica: async (req, res) => {
        try {
            const { fecha } = req.params;
            const count = await HistoriaClinicaRFModel.count({ where: { fecha } });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar registro diario de terapia", error: error.message });
        }
    },

    validarConsolidadoMensualMedicinaGeneral: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const count = await HistoriaClinicaMGModel.count({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar consolidado mensual", error: error.message });
        }
    },

    validarConsolidadoMensualTerapia: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const count = await HistoriaClinicaRFModel.count({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar consolidado mensual de terapia", error: error.message });
        }
    },

    validarLugarMG: async (req, res) => {
        try {
            const { lugar, desde, hasta } = req.params;
            const count = await HistoriaClinicaMGModel.count({
                where: { lugar_atencion: lugar, fecha: { [Op.gte]: desde, [Op.lte]: hasta } }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar reporte por lugar", error: error.message });
        }
    },

    validarLugarRF: async (req, res) => {
        try {
            const { lugar, desde, hasta } = req.params;
            const count = await HistoriaClinicaRFModel.count({
                where: { lugar_atencion: lugar, fecha: { [Op.gte]: desde, [Op.lte]: hasta } }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar reporte por lugar (RF)", error: error.message });
        }
    },

    validarRecaudacionDiarioMedicinaGeneral: async (req, res) => {
        try {
            const { fecha, id_rol } = req.params;
            const count = await RecaudacionModel.count({ where: { fecha, id_rol } });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar recaudación diaria", error: error.message });
        }
    },

    validarRecaudacionDiarioTerapia: async (req, res) => {
        try {
            const { fecha, id_rol } = req.params;
            const count = await RecaudacionModel.count({ where: { fecha, id_rol } });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar recaudación diaria de terapia", error: error.message });
        }
    },

    validarRecaudacionMensual: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const count = await RecaudacionModel.count({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            return respuestaValidacion(res, count);
        } catch (error) {
            res.status(500).json({ message: "Error al validar recaudación mensual", error: error.message });
        }
    },

    validarReceta: async (req, res) => {
        try {
            const { id_entrega } = req.params;
            const entrega = await EntregaModel.findByPk(id_entrega);
            return respuestaValidacion(res, entrega ? 1 : 0);
        } catch (error) {
            res.status(500).json({ message: "Error al validar receta", error: error.message });
        }
    },

    // ===== REGISTRO DIARIO DE ATENCIÓN Y CONSULTAS MÉDICAS (formato MSP) =====
    registroDiarioMedicina: async (req, res) => {
        try {
            const { fecha } = req.params;

            const datosMG = await HistoriaClinicaMGModel.findAll({
                where: { fecha },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: EnfermedadModel, as: 'enfermedad' }
                ]
            });
            const parametrosecre = await ParametroModel.findOne({ where: { cargo: 'Médico General', estado: true } });

            const [anio, mes, dia] = fecha.split('-');
            const mesNombre = nombreDelMes(mes);

            // TOTAL[0..41], ver mapeo de columnas más abajo (mismo orden que el formato MSP original)
            const TOTAL = Array(42).fill(0);
            const filas = [];

            datosMG.forEach((item, idx) => {
                const p = item.paciente || {};
                const nombres = `${p.apellidos || ''} ${p.nombres || ''}`.trim();
                const edad = parseFloat(p.edad) || 0;

                const lugar = [' ', ' ', ' ', ' '];
                if (item.lugar_atencion === 'Patronato') { lugar[0] = 'X'; TOTAL[0]++; }
                else if (item.lugar_atencion === 'Comunidad') { lugar[1] = 'X'; TOTAL[1]++; }
                else if (item.lugar_atencion === 'Clinica movil') { lugar[2] = 'X'; TOTAL[2]++; }
                else { lugar[3] = 'X'; TOTAL[3]++; }
                TOTAL[4] = idx + 1; // total de atenciones acumulado (correlativo del día)

                const sexo = [' ', ' '];
                if (p.sexo === 'Hombre') { sexo[0] = 'X'; TOTAL[5]++; } else { sexo[1] = 'X'; TOTAL[6]++; }

                const mujer = [' ', ' ', ' ', ' '];
                const nombreEnfermedad = item.enfermedad?.enfermedad || '';
                if (p.sexo === 'Mujer') {
                    if (nombreEnfermedad === 'Control de Embarazo') {
                        if (item.tipo_atencion === 'Primera') { mujer[0] = 'X'; TOTAL[7]++; }
                        else { mujer[1] = 'X'; TOTAL[8]++; }
                    } else if (nombreEnfermedad === 'Planificación Familiar') {
                        if (item.tipo_atencion === 'Primera') { mujer[2] = 'X'; TOTAL[9]++; }
                        else { mujer[3] = 'X'; TOTAL[10]++; }
                    }
                }

                const ninos = [' ', ' ', ' ', ' ', ' '];
                const edadesm = [' ', ' ', ' '];
                const morbilidad = ['', '', '', '', '', '', '', '', '', ''];

                if (item.tipo_atencion === 'Prevención') {
                    if (edad < 1) {
                        if (item.tipo_atencion === 'Primera') { ninos[0] = 'X'; TOTAL[11]++; }
                        else { ninos[1] = 'X'; TOTAL[12]++; }
                    } else if (edad >= 1 && edad <= 4) {
                        if (item.tipo_atencion === 'Primera') { ninos[2] = 'X'; TOTAL[13]++; }
                        else { ninos[3] = 'X'; TOTAL[14]++; }
                    } else if (edad >= 5 && edad <= 9) {
                        ninos[4] = 'X'; TOTAL[15]++;
                    }
                    if (edad >= 10 && edad <= 14) { edadesm[0] = 'X'; TOTAL[16]++; }
                    else if (edad >= 15 && edad <= 19) { edadesm[1] = 'X'; TOTAL[17]++; }
                    else if (edad >= 20) { edadesm[2] = 'X'; TOTAL[18]++; }
                } else {
                    if (edad < 0.1) { morbilidad[0] = 'X'; TOTAL[19]++; }
                    else if (edad >= 0.1 && edad <= 0.11) { morbilidad[1] = 'X'; TOTAL[20]++; }
                    else if (edad >= 1 && edad <= 4) { morbilidad[2] = 'X'; TOTAL[21]++; }
                    else if (edad >= 5 && edad <= 9) { morbilidad[3] = 'X'; TOTAL[22]++; }
                    else if (edad >= 10 && edad <= 14) { morbilidad[4] = 'X'; TOTAL[23]++; }
                    else if (edad >= 15 && edad <= 19) { morbilidad[5] = 'X'; TOTAL[24]++; }
                    else if (edad >= 20 && edad <= 35) { morbilidad[6] = 'X'; TOTAL[25]++; } // corregido: el PHP original sumaba en el índice 26 por error
                    else if (edad >= 36 && edad <= 49) { morbilidad[7] = 'X'; TOTAL[26]++; }
                    else if (edad >= 50 && edad <= 64) { morbilidad[8] = 'X'; TOTAL[27]++; }
                    else if (edad >= 65) { morbilidad[9] = 'X'; TOTAL[28]++; }
                }

                const tipo = [' ', ' ', ' '];
                if (item.tipo_atencion === 'Prevención') { tipo[0] = 'X'; TOTAL[29]++; }
                else if (item.tipo_atencion === 'Primera') { tipo[1] = 'X'; TOTAL[30]++; }
                else { tipo[2] = 'X'; TOTAL[31]++; }

                const diagno = [' ', ' '];
                if (item.condicion_diagnostico === 'Presuntivo') { diagno[0] = 'X'; TOTAL[32]++; }
                else { diagno[1] = 'X'; TOTAL[33]++; }

                const certificado = item.certificado ? 'X' : ' ';
                if (item.certificado) TOTAL[34]++;

                const grupo = [' ', ' ', ' ', ' ', ' ', ' ', ' '];
                const gap = p.grupo_a_prioritaria;
                if (gap === 'Adultos mayores') { grupo[0] = 'X'; TOTAL[35]++; }
                else if (gap === 'niñas,niños y adolescentes') { grupo[1] = 'X'; TOTAL[36]++; }
                else if (gap === 'Mujeres embarazadas') { grupo[2] = 'X'; TOTAL[37]++; }
                else if (gap === 'Discapacidad') { grupo[3] = 'X'; TOTAL[38]++; }
                else if (gap === 'Privados de libertad') { grupo[4] = 'X'; TOTAL[39]++; }
                else if (gap === 'Enfermedades catastroficas') { grupo[5] = 'X'; TOTAL[40]++; }
                else if (gap === 'Ninguno') { grupo[6] = 'X'; TOTAL[41]++; }

                filas.push({
                    num: idx + 1, nombres, lugar, sexo, mujer, ninos, edadesm, morbilidad,
                    diagnostico: nombreEnfermedad, tipo, diagno, certificado, grupo
                });
            });

            // --- Render PDF (A3 apaisado, formato denso tipo MSP) ---
            const doc = crearDocumentoConMembrete({
                titulo: `UNIDAD DE ASISTENCIA SOCIAL DEL G.A.D MUNICIPAL JUNÍN\nREGISTRO DIARIO DE ATENCIÓN Y CONSULTAS MÉDICAS`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=RegistroDiarioMedicina${fecha}.pdf`);
            doc.pipe(res);

            const anchoNum = 16, anchoNombres = 90, anchoAngosta = 16, anchoDiagnostico = 75;
            const grupos = [
                { titulo: 'LUGAR', labels: ['PATRONATO', 'COMUNIDAD', 'CLÍNICA MÓVIL', 'DOMICILIO'] },
                { titulo: 'SEXO', labels: ['HOMBRE', 'MUJER'] },
                { titulo: 'MUJERES', labels: ['PRENATAL-1ra', 'PRENATAL-SUB', 'PLANIF FAM-1ra', 'PLANIF FAM-SUB'] },
                { titulo: 'NIÑOS PREV.', labels: ['<1a-1ra', '<1a-SUB', '1-4a-1ra', '1-4a-SUB', '5-9a'] },
                { titulo: 'EDAD PREV.', labels: ['10-14a', '15-19a', '>=20a'] },
                { titulo: 'MORBILIDAD POR EDAD', labels: ['<1mes', '1-11m', '1-4a', '5-9a', '10-14a', '15-19a', '20-35a', '36-49a', '50-64a', '>65a'] },
                { titulo: 'TIPO ATENCIÓN', labels: ['PREVENCIÓN', 'PRIMERA', 'SUBSECUENTE'] },
                { titulo: 'DIAGNÓSTICO', labels: ['PRESUNTIVO', 'DEFINITIVO'] },
                { titulo: 'G. PRIORITARIO', labels: ['ADULTO MAYOR', 'NIÑEZ/ADOLES.', 'EMBARAZADAS', 'DISCAPACIDAD', 'PRIV. LIBERTAD', 'ENF. CATASTRÓF.', 'NINGUNO'] }
            ];

            const x0 = doc.page.margins.left;
            let y = 110;

            // Fila de grupo (títulos)
            let cx = x0 + anchoNum + anchoNombres;
            doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            for (const g of grupos) {
                const w = g.labels.length * anchoAngosta;
                doc.rect(cx, y, w, 14).stroke();
                doc.text(g.titulo, cx, y + 3, { width: w, align: 'center' });
                cx += w;
                if (g.titulo === 'MORBILIDAD POR EDAD') { cx += anchoDiagnostico; } // hueco para diagnóstico (texto libre)
            }
            doc.rect(x0, y, anchoNum, 14).stroke();
            doc.rect(x0 + anchoNum, y, anchoNombres, 14).stroke();
            doc.text('N° / NOMBRES', x0, y + 3, { width: anchoNum + anchoNombres, align: 'center' });

            // Fila de sub-etiquetas (rotadas)
            const yRot = y + 14;
            const alturaRot = 85;
            cx = x0 + anchoNum + anchoNombres;
            for (const g of grupos) {
                for (const label of g.labels) {
                    dibujarCeldaRotada(doc, { x: cx, y: yRot, w: anchoAngosta, h: alturaRot, texto: label, fontSize: 5.5 });
                    cx += anchoAngosta;
                }
                if (g.titulo === 'MORBILIDAD POR EDAD') {
                    doc.rect(cx, yRot, anchoDiagnostico, alturaRot).stroke();
                    doc.save();
                    doc.fontSize(5.5).font('Helvetica-Bold').fillColor(COLOR_VERDE);
                    doc.rotate(-90, { origin: [cx + anchoDiagnostico / 2, yRot + alturaRot / 2] });
                    doc.text('DIAGNÓSTICO', cx + anchoDiagnostico / 2 - alturaRot / 2, yRot + alturaRot / 2 - 3, { width: alturaRot, align: 'center' });
                    doc.restore();
                    cx += anchoDiagnostico;
                }
            }
            doc.rect(x0, yRot, anchoNum, alturaRot).stroke();
            doc.rect(x0 + anchoNum, yRot, anchoNombres, alturaRot).stroke();

            y = yRot + alturaRot;

            // Filas de datos
            doc.fontSize(6).font('Helvetica');
            const alturaFila = 12;
            for (const fila of filas) {
                if (y > doc.page.height - 90) {
                    doc.addPage({ size: 'A3', layout: 'landscape', margins: doc.page.margins });
                    y = doc.page.margins.top;
                }
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoNum, h: alturaFila, texto: fila.num, fontSize: 6, negrita: false }); cx += anchoNum;
                dibujarCelda(doc, { x: cx, y, w: anchoNombres, h: alturaFila, texto: fila.nombres, fontSize: 6, negrita: false, align: 'left' }); cx += anchoNombres;
                for (const v of fila.lugar) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.sexo) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.mujer) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.ninos) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.edadesm) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.morbilidad) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                dibujarCelda(doc, { x: cx, y, w: anchoDiagnostico, h: alturaFila, texto: fila.diagnostico, fontSize: 5.5, negrita: false, align: 'left' }); cx += anchoDiagnostico;
                for (const v of fila.tipo) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.diagno) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.grupo) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                y += alturaFila;
            }

            // Fila de totales
            dibujarCelda(doc, { x: x0, y, w: anchoNum + anchoNombres, h: 16, texto: 'TOTAL', fontSize: 8, color: COLOR_VERDE, align: 'center' });
            cx = x0 + anchoNum + anchoNombres;
            let ti = 0;
            const columnasPorGrupo = grupos.map(g => g.labels.length);
            for (let gi = 0; gi < grupos.length; gi++) {
                for (let c = 0; c < columnasPorGrupo[gi]; c++) {
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 16, texto: TOTAL[ti], fontSize: 7, color: COLOR_VERDE });
                    cx += anchoAngosta; ti++;
                }
                if (grupos[gi].titulo === 'MORBILIDAD POR EDAD') cx += anchoDiagnostico; // hueco diagnóstico
            }

            y += 40;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosecre?.profesion || ''} ${parametrosecre?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);
            doc.fontSize(8).text(`Fecha: ${dia} de ${mesNombre} de ${anio}`, x0 + 60, y + 28);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar registro diario de medicina", error: error.message });
        }
    },

    // ===== REGISTRO DIARIO DE ATENCIÓN - REHABILITACIÓN FÍSICA (formato MSP) =====
    registroDiarioFisica: async (req, res) => {
        try {
            const { fecha } = req.params;

            const datosRF = await HistoriaClinicaRFModel.findAll({
                where: { fecha },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: DiagnosticoModel, as: 'diagnostico' },
                    { model: TratamientoModel, as: 'tratamientos' }
                ]
            });
            const parametrosRF = await ParametroModel.findOne({ where: { cargo: 'Médico Rehabilitación Física', estado: true } });

            const [anio, mes, dia] = fecha.split('-');
            const mesNombre = nombreDelMes(mes);

            const TOTAL = Array(27).fill(0);
            const filas = [];

            datosRF.forEach((item, idx) => {
                const p = item.paciente || {};
                const nombres = `${p.apellidos || ''} ${p.nombres || ''}`.trim();
                const edad = parseFloat(p.edad) || 0;
                const t = item.tratamientos || {};

                const lugar = [' ', ' ', ' '];
                if (item.lugar_atencion === 'Patronato') { lugar[0] = 'X'; TOTAL[0]++; }
                else if (item.lugar_atencion === 'Clinica movil') { lugar[1] = 'X'; TOTAL[1]++; }
                else { lugar[2] = 'X'; TOTAL[2]++; }
                TOTAL[3] = idx + 1;

                const sexo = [' ', ' '];
                if (p.sexo === 'Hombre') { sexo[0] = 'X'; TOTAL[4]++; } else { sexo[1] = 'X'; TOTAL[5]++; }

                const morbilidad = [' ', ' ', ' ', ' ', ' '];
                if (edad >= 0 && edad <= 3) { morbilidad[0] = 'X'; TOTAL[6]++; }
                else if (edad >= 4 && edad <= 12) { morbilidad[1] = 'X'; TOTAL[7]++; }
                else if (edad >= 13 && edad <= 19) { morbilidad[2] = 'X'; TOTAL[8]++; }
                else if (edad >= 20 && edad <= 49) { morbilidad[3] = 'X'; TOTAL[9]++; }
                else if (edad >= 50) { morbilidad[4] = 'X'; TOTAL[10]++; }

                const diagnosticoTxt = item.diagnostico?.diagnostico || '';

                const tratamiento = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
                if (t.estimulacion_temprana === 'Estimulación temprana') { tratamiento[0] = 'X'; TOTAL[11]++; }
                if (t.magnetoterapia === 'Magnetoterapia') { tratamiento[1] = 'X'; TOTAL[12]++; }
                if (t.electroestimulacion === 'Electroestimulación') { tratamiento[2] = 'X'; TOTAL[13]++; }
                if (t.ultrasonido === 'Ultrasonido') { tratamiento[3] = 'X'; TOTAL[14]++; }
                if (t.C_Q_C_O_H === 'C.Q.C. O H.') { tratamiento[4] = 'X'; TOTAL[15]++; }
                if (t.masaje === 'Masaje') { tratamiento[5] = 'X'; TOTAL[16]++; }
                if (t.ejercicios_pasivos_resistidos === 'Ejercicios pasivos y resistidos') { tratamiento[6] = 'X'; TOTAL[17]++; }
                if (t.laser === 'Láser') { tratamiento[7] = 'X'; TOTAL[18]++; }
                if (t.otros && t.otros !== 'No aplica') { tratamiento[8] = 'X'; TOTAL[19]++; }

                const grupo = [' ', ' ', ' ', ' ', ' ', ' ', ' '];
                const gap = p.grupo_a_prioritaria;
                if (gap === 'Adultos mayores') { grupo[0] = 'X'; TOTAL[20]++; }
                else if (gap === 'niñas,niños y adolescentes') { grupo[1] = 'X'; TOTAL[21]++; }
                else if (gap === 'Mujeres embarazadas') { grupo[2] = 'X'; TOTAL[22]++; }
                else if (gap === 'Discapacidad') { grupo[3] = 'X'; TOTAL[23]++; }
                else if (gap === 'Privados de libertad') { grupo[4] = 'X'; TOTAL[24]++; }
                else if (gap === 'Enfermedades catastroficas') { grupo[5] = 'X'; TOTAL[25]++; }
                else if (gap === 'Ninguno') { grupo[6] = 'X'; TOTAL[26]++; }

                filas.push({ num: idx + 1, nombres, lugar, sexo, morbilidad, diagnostico: diagnosticoTxt, tratamiento, grupo });
            });

            const doc = crearDocumentoConMembrete({
                titulo: `UNIDAD DE ASISTENCIA SOCIAL DEL G.A.D MUNICIPAL JUNÍN\nREGISTRO DIARIO DE ATENCIÓN - REHABILITACIÓN FÍSICA`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=RegistroDiarioFisica${fecha}.pdf`);
            doc.pipe(res);

            const anchoNum = 16, anchoNombres = 100, anchoAngosta = 20, anchoDiagnostico = 90;
            const grupos = [
                { titulo: 'LUGAR', labels: ['PATRONATO', 'CLÍNICA MÓVIL', 'DOMICILIO'] },
                { titulo: 'SEXO', labels: ['HOMBRE', 'MUJER'] },
                { titulo: 'EDAD', labels: ['0-3a', '4-12a', '13-19a', '20-49a', '>=50a'] },
                { titulo: 'TRATAMIENTO', labels: ['ESTIM. TEMPRANA', 'MAGNETOTERAPIA', 'ELECTROESTIM.', 'ULTRASONIDO', 'C.Q.C./O.H.', 'MASAJE', 'EJERC. PAS/RESIST.', 'LÁSER', 'OTROS'] },
                { titulo: 'G. PRIORITARIO', labels: ['ADULTO MAYOR', 'NIÑEZ/ADOLES.', 'EMBARAZADAS', 'DISCAPACIDAD', 'PRIV. LIBERTAD', 'ENF. CATASTRÓF.', 'NINGUNO'] }
            ];

            const x0 = doc.page.margins.left;
            let y = 110;

            let cx = x0 + anchoNum + anchoNombres;
            doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            for (const g of grupos) {
                const w = g.labels.length * anchoAngosta;
                doc.rect(cx, y, w, 14).stroke();
                doc.text(g.titulo, cx, y + 3, { width: w, align: 'center' });
                cx += w;
                if (g.titulo === 'EDAD') { cx += anchoDiagnostico; }
            }
            doc.rect(x0, y, anchoNum, 14).stroke();
            doc.rect(x0 + anchoNum, y, anchoNombres, 14).stroke();
            doc.text('N° / NOMBRES', x0, y + 3, { width: anchoNum + anchoNombres, align: 'center' });

            const yRot = y + 14;
            const alturaRot = 80;
            cx = x0 + anchoNum + anchoNombres;
            for (const g of grupos) {
                for (const label of g.labels) {
                    dibujarCeldaRotada(doc, { x: cx, y: yRot, w: anchoAngosta, h: alturaRot, texto: label, fontSize: 6 });
                    cx += anchoAngosta;
                }
                if (g.titulo === 'EDAD') {
                    doc.rect(cx, yRot, anchoDiagnostico, alturaRot).stroke();
                    doc.save();
                    doc.fontSize(6).font('Helvetica-Bold').fillColor(COLOR_VERDE);
                    doc.rotate(-90, { origin: [cx + anchoDiagnostico / 2, yRot + alturaRot / 2] });
                    doc.text('DIAGNÓSTICO', cx + anchoDiagnostico / 2 - alturaRot / 2, yRot + alturaRot / 2 - 3, { width: alturaRot, align: 'center' });
                    doc.restore();
                    cx += anchoDiagnostico;
                }
            }
            doc.rect(x0, yRot, anchoNum, alturaRot).stroke();
            doc.rect(x0 + anchoNum, yRot, anchoNombres, alturaRot).stroke();

            y = yRot + alturaRot;

            doc.fontSize(6).font('Helvetica');
            const alturaFila = 12;
            for (const fila of filas) {
                if (y > doc.page.height - 90) {
                    doc.addPage({ size: 'A3', layout: 'landscape', margins: doc.page.margins });
                    y = doc.page.margins.top;
                }
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoNum, h: alturaFila, texto: fila.num, fontSize: 6, negrita: false }); cx += anchoNum;
                dibujarCelda(doc, { x: cx, y, w: anchoNombres, h: alturaFila, texto: fila.nombres, fontSize: 6, negrita: false, align: 'left' }); cx += anchoNombres;
                for (const v of fila.lugar) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.sexo) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.morbilidad) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                dibujarCelda(doc, { x: cx, y, w: anchoDiagnostico, h: alturaFila, texto: fila.diagnostico, fontSize: 5.5, negrita: false, align: 'left' }); cx += anchoDiagnostico;
                for (const v of fila.tratamiento) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                for (const v of fila.grupo) { dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: v, negrita: false }); cx += anchoAngosta; }
                y += alturaFila;
            }

            dibujarCelda(doc, { x: x0, y, w: anchoNum + anchoNombres, h: 16, texto: 'TOTAL', fontSize: 8, color: COLOR_VERDE, align: 'center' });
            cx = x0 + anchoNum + anchoNombres;
            let ti = 0;
            for (const g of grupos) {
                for (let c = 0; c < g.labels.length; c++) {
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 16, texto: TOTAL[ti], fontSize: 7, color: COLOR_VERDE });
                    cx += anchoAngosta; ti++;
                }
                if (g.titulo === 'EDAD') cx += anchoDiagnostico;
            }

            y += 40;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosRF?.profesion || ''} ${parametrosRF?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);
            doc.fontSize(8).text(`Fecha: ${dia} de ${mesNombre} de ${anio}`, x0 + 60, y + 28);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar registro diario de fisica", error: error.message });
        }
    },

    // ===== CONSOLIDADO MENSUAL - MEDICINA GENERAL (matriz por día del mes) =====
    consolidadoMensualMedicinaGeneral: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const mesNombre = nombreDelMes(mes);
            const parametrosecre = await ParametroModel.findOne({ where: { cargo: 'Médico General', estado: true } });

            const datosMG = await HistoriaClinicaMGModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: EnfermedadModel, as: 'enfermedad' }
                ]
            });

            // Result[1..31], cada uno con las mismas 42 columnas categóricas que el registro diario
            const dias = {};
            for (let i = 1; i <= 31; i++) dias[i] = Array(42).fill(0);

            datosMG.forEach(item => {
                const diaMes = parseInt(item.fecha.split('-')[2], 10);
                const p = item.paciente || {};
                const edad = parseFloat(p.edad) || 0;
                const fila = dias[diaMes];
                if (!fila) return;

                if (item.lugar_atencion === 'Patronato') fila[0]++;
                else if (item.lugar_atencion === 'Comunidad') fila[1]++;
                else if (item.lugar_atencion === 'Clinica movil') fila[2]++;
                else fila[3]++;
                fila[4]++; // total atenciones del día

                if (p.sexo === 'Hombre') fila[5]++; else fila[6]++;

                const nombreEnfermedad = item.enfermedad?.enfermedad || '';
                if (p.sexo === 'Mujer') {
                    if (nombreEnfermedad === 'Control de Embarazo') {
                        if (item.tipo_atencion === 'Primera') fila[7]++; else fila[8]++;
                    } else if (nombreEnfermedad === 'Planificación Familiar') {
                        if (item.tipo_atencion === 'Primera') fila[9]++; else fila[10]++;
                    }
                }

                if (item.tipo_atencion === 'Prevención') {
                    // Nota: a diferencia del registro diario por paciente, aquí se fusiona
                    // Primera+Subsecuente en una sola columna por franja etaria para mantener
                    // la tabla legible (31 filas x muchas columnas). Ningún conteo se pierde.
                    if (edad < 1) fila[11]++;
                    else if (edad >= 1 && edad <= 4) fila[13]++;
                    else if (edad >= 5 && edad <= 9) fila[15]++;
                    if (edad >= 10 && edad <= 14) fila[16]++;
                    else if (edad >= 15 && edad <= 19) fila[17]++;
                    else if (edad >= 20) fila[18]++;
                } else {
                    if (edad < 0.1) fila[19]++;
                    else if (edad >= 0.1 && edad <= 0.11) fila[20]++;
                    else if (edad >= 1 && edad <= 4) fila[21]++;
                    else if (edad >= 5 && edad <= 9) fila[22]++;
                    else if (edad >= 10 && edad <= 14) fila[23]++;
                    else if (edad >= 15 && edad <= 19) fila[24]++;
                    else if (edad >= 20 && edad <= 35) fila[25]++;
                    else if (edad >= 36 && edad <= 49) fila[26]++;
                    else if (edad >= 50 && edad <= 64) fila[27]++;
                    else if (edad >= 65) fila[28]++;
                }

                if (item.tipo_atencion === 'Prevención') fila[29]++;
                else if (item.tipo_atencion === 'Primera') fila[30]++;
                else fila[31]++;

                if (item.condicion_diagnostico === 'Presuntivo') fila[32]++; else fila[33]++;
                if (item.certificado) fila[34]++;

                const gap = p.grupo_a_prioritaria;
                if (gap === 'Adultos mayores') fila[35]++;
                else if (gap === 'niñas,niños y adolescentes') fila[36]++;
                else if (gap === 'Mujeres embarazadas') fila[37]++;
                else if (gap === 'Discapacidad') fila[38]++;
                else if (gap === 'Privados de libertad') fila[39]++;
                else if (gap === 'Enfermedades catastroficas') fila[40]++;
                else if (gap === 'Ninguno') fila[41]++;
            });

            const totalGeneral = Array(42).fill(0);
            for (let i = 1; i <= 31; i++) {
                for (let c = 0; c < 42; c++) totalGeneral[c] += dias[i][c];
            }

            const doc = crearDocumentoConMembrete({
                titulo: `CONSOLIDADO MENSUAL DE ATENCIÓN - MEDICINA GENERAL\n${mesNombre} ${year}`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=ConsolidadoMensualMedicinaGeneral-${mes}-${year}.pdf`);
            doc.pipe(res);

            const anchoDia = 30, anchoAngosta = 20;
            const grupos = [
                { titulo: 'LUGAR', labels: ['PATRONATO', 'COMUNIDAD', 'CLÍNICA MÓVIL', 'DOMICILIO'] },
                { titulo: 'AT.', labels: ['TOTAL'] },
                { titulo: 'SEXO', labels: ['HOMBRE', 'MUJER'] },
                { titulo: 'MUJERES', labels: ['PRENAT-1ra', 'PRENAT-SUB', 'PLANIF-1ra', 'PLANIF-SUB'] },
                { titulo: 'NIÑOS PREV.', labels: ['<1a', '1-4a', '5-9a'] },
                { titulo: 'EDAD PREV.', labels: ['10-14a', '15-19a', '>=20a'] },
                { titulo: 'MORBILIDAD POR EDAD', labels: ['<1mes', '1-11m', '1-4a', '5-9a', '10-14a', '15-19a', '20-35a', '36-49a', '50-64a', '>65a'] },
                { titulo: 'TIPO ATENCIÓN', labels: ['PREVENCIÓN', 'PRIMERA', 'SUBSECUENTE'] },
                { titulo: 'DIAGNÓSTICO', labels: ['PRESUNTIVO', 'DEFINITIVO'] },
                { titulo: 'CERT.', labels: ['CERTIF.'] },
                { titulo: 'G. PRIORITARIO', labels: ['ADULTO MAYOR', 'NIÑEZ/ADOLES.', 'EMBARAZADAS', 'DISCAPACIDAD', 'PRIV. LIBERTAD', 'ENF. CATASTRÓF.', 'NINGUNO'] }
            ];
            // Nota: NIÑOS PREV. se simplifica a 3 columnas (sin distinguir 1ra/subsecuente) para
            // mantener el ancho manejable; los conteos de fila[12] y fila[14] (subsecuente) se
            // suman dentro de la misma columna visual que su par "Primera".
            const indicesColumnas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41];

            const x0 = doc.page.margins.left;
            let y = 110;

            let cx = x0 + anchoDia;
            doc.fontSize(6.5).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            for (const g of grupos) {
                const w = g.labels.length * anchoAngosta;
                doc.rect(cx, y, w, 14).stroke();
                doc.text(g.titulo, cx, y + 3, { width: w, align: 'center' });
                cx += w;
            }
            doc.rect(x0, y, anchoDia, 14).stroke();
            doc.text('DÍA', x0, y + 3, { width: anchoDia, align: 'center' });

            const yRot = y + 14;
            const alturaRot = 75;
            cx = x0 + anchoDia;
            for (const g of grupos) {
                for (const label of g.labels) {
                    dibujarCeldaRotada(doc, { x: cx, y: yRot, w: anchoAngosta, h: alturaRot, texto: label, fontSize: 6 });
                    cx += anchoAngosta;
                }
            }
            doc.rect(x0, yRot, anchoDia, alturaRot).stroke();

            y = yRot + alturaRot;
            doc.fontSize(6).font('Helvetica');
            const alturaFila = 12;

            for (let i = 1; i <= 31; i++) {
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoDia, h: alturaFila, texto: i, fontSize: 6, negrita: true }); cx += anchoDia;
                const fila = dias[i];
                for (const idx of indicesColumnas) {
                    const valor = fila[idx] || '';
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: valor, fontSize: 6, negrita: false });
                    cx += anchoAngosta;
                }
                y += alturaFila;
            }

            dibujarCelda(doc, { x: x0, y, w: anchoDia, h: 16, texto: 'TOTAL', fontSize: 7, color: COLOR_VERDE });
            cx = x0 + anchoDia;
            for (const idx of indicesColumnas) {
                dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 16, texto: totalGeneral[idx], fontSize: 7, color: COLOR_VERDE });
                cx += anchoAngosta;
            }

            y += 40;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosecre?.profesion || ''} ${parametrosecre?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar consolidado mensual", error: error.message });
        }
    },

    // ===== CONSOLIDADO MENSUAL - REHABILITACIÓN FÍSICA (matriz por día del mes) =====
    consolidadoMensualTerapia: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const mesNombre = nombreDelMes(mes);
            const parametrosRF = await ParametroModel.findOne({ where: { cargo: 'Médico Rehabilitación Física', estado: true } });

            const datosRF = await HistoriaClinicaRFModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: TratamientoModel, as: 'tratamientos' }
                ]
            });

            const dias = {};
            for (let i = 1; i <= 31; i++) dias[i] = Array(27).fill(0);

            datosRF.forEach(item => {
                const diaMes = parseInt(item.fecha.split('-')[2], 10);
                const p = item.paciente || {};
                const edad = parseFloat(p.edad) || 0;
                const t = item.tratamientos || {};
                const fila = dias[diaMes];
                if (!fila) return;

                if (item.lugar_atencion === 'Patronato') fila[0]++;
                else if (item.lugar_atencion === 'Clinica movil') fila[1]++;
                else fila[2]++;
                fila[3]++; // total atenciones del día

                if (p.sexo === 'Hombre') fila[4]++; else fila[5]++;

                if (edad > 0 && edad <= 3) fila[6]++;
                else if (edad >= 4 && edad <= 12) fila[7]++;
                else if (edad >= 13 && edad <= 19) fila[8]++;
                else if (edad >= 20 && edad <= 49) fila[9]++;
                else if (edad >= 50) fila[10]++;

                if (t.estimulacion_temprana === 'Estimulación temprana') fila[11]++;
                if (t.magnetoterapia === 'Magnetoterapia') fila[12]++;
                if (t.electroestimulacion === 'Electroestimulación') fila[13]++;
                if (t.ultrasonido === 'Ultrasonido') fila[14]++;
                if (t.C_Q_C_O_H === 'C.Q.C. O H.') fila[15]++;
                if (t.masaje === 'Masaje') fila[16]++;
                if (t.ejercicios_pasivos_resistidos === 'Ejercicios pasivos y resistidos') fila[17]++;
                if (t.laser === 'Láser') fila[18]++;
                if (t.otros && t.otros !== 'No aplica') fila[19]++;

                const gap = p.grupo_a_prioritaria;
                if (gap === 'Adultos mayores') fila[20]++;
                else if (gap === 'niñas,niños y adolescentes') fila[21]++;
                else if (gap === 'Mujeres embarazadas') fila[22]++;
                else if (gap === 'Discapacidad') fila[23]++;
                else if (gap === 'Privados de libertad') fila[24]++;
                else if (gap === 'Enfermedades catastroficas') fila[25]++;
                else if (gap === 'Ninguno') fila[26]++;
            });

            const totalGeneral = Array(27).fill(0);
            for (let i = 1; i <= 31; i++) {
                for (let c = 0; c < 27; c++) totalGeneral[c] += dias[i][c];
            }

            const doc = crearDocumentoConMembrete({
                titulo: `CONSOLIDADO MENSUAL DE ATENCIÓN - REHABILITACIÓN FÍSICA\n${mesNombre} ${year}`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=ConsolidadoMensualTerapia-${mes}-${year}.pdf`);
            doc.pipe(res);

            const anchoDia = 30, anchoAngosta = 24;
            const grupos = [
                { titulo: 'LUGAR', labels: ['PATRONATO', 'CLÍNICA MÓVIL', 'DOMICILIO'] },
                { titulo: 'AT.', labels: ['TOTAL'] },
                { titulo: 'SEXO', labels: ['HOMBRE', 'MUJER'] },
                { titulo: 'EDAD', labels: ['0-3a', '4-12a', '13-19a', '20-49a', '>=50a'] },
                { titulo: 'TRATAMIENTO', labels: ['ESTIM. TEMPRANA', 'MAGNETOTERAPIA', 'ELECTROESTIM.', 'ULTRASONIDO', 'C.Q.C./O.H.', 'MASAJE', 'EJERC. PAS/RESIST.', 'LÁSER', 'OTROS'] },
                { titulo: 'G. PRIORITARIO', labels: ['ADULTO MAYOR', 'NIÑEZ/ADOLES.', 'EMBARAZADAS', 'DISCAPACIDAD', 'PRIV. LIBERTAD', 'ENF. CATASTRÓF.', 'NINGUNO'] }
            ];

            const x0 = doc.page.margins.left;
            let y = 110;

            let cx = x0 + anchoDia;
            doc.fontSize(6.5).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            for (const g of grupos) {
                const w = g.labels.length * anchoAngosta;
                doc.rect(cx, y, w, 14).stroke();
                doc.text(g.titulo, cx, y + 3, { width: w, align: 'center' });
                cx += w;
            }
            doc.rect(x0, y, anchoDia, 14).stroke();
            doc.text('DÍA', x0, y + 3, { width: anchoDia, align: 'center' });

            const yRot = y + 14;
            const alturaRot = 75;
            cx = x0 + anchoDia;
            for (const g of grupos) {
                for (const label of g.labels) {
                    dibujarCeldaRotada(doc, { x: cx, y: yRot, w: anchoAngosta, h: alturaRot, texto: label, fontSize: 6 });
                    cx += anchoAngosta;
                }
            }
            doc.rect(x0, yRot, anchoDia, alturaRot).stroke();

            y = yRot + alturaRot;
            doc.fontSize(6).font('Helvetica');
            const alturaFila = 12;

            for (let i = 1; i <= 31; i++) {
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoDia, h: alturaFila, texto: i, fontSize: 6, negrita: true }); cx += anchoDia;
                const fila = dias[i];
                for (let idx = 0; idx < 27; idx++) {
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: alturaFila, texto: fila[idx] || '', fontSize: 6, negrita: false });
                    cx += anchoAngosta;
                }
                y += alturaFila;
            }

            dibujarCelda(doc, { x: x0, y, w: anchoDia, h: 16, texto: 'TOTAL', fontSize: 7, color: COLOR_VERDE });
            cx = x0 + anchoDia;
            for (let idx = 0; idx < 27; idx++) {
                dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 16, texto: totalGeneral[idx], fontSize: 7, color: COLOR_VERDE });
                cx += anchoAngosta;
            }

            y += 40;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosRF?.profesion || ''} ${parametrosRF?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar consolidado mensual de terapia", error: error.message });
        }
    },

    // ===== REPORTE POR LUGAR DE ATENCIÓN (MG y RF) =====
    // Nota: la plantilla original pedía una columna "motivo_consulta" que no
    // existe en el esquema real de historias_clinicas_mg/rf. Se usa en su
    // lugar el nombre de la enfermedad/diagnóstico asociado, que es el dato
    // más cercano realmente disponible en la base de datos.
    lugarAtencionMedicinaGeneral: async (req, res) => {
        try {
            const { lugar, desde, hasta } = req.params;
            const data = await HistoriaClinicaMGModel.findAll({
                where: { lugar_atencion: lugar, fecha: { [Op.gte]: desde, [Op.lte]: hasta } },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: EnfermedadModel, as: 'enfermedad' }
                ]
            });
            const filas = data.map(item => ({
                nombre: `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`.trim(),
                motivo: item.enfermedad?.enfermedad || '',
                edad: item.paciente?.edad || ''
            }));
            return generarReporteLugarAtencion(res, { filas, lugar, desde, hasta, subtitulo: 'MEDICINA GENERAL' });
        } catch (error) {
            res.status(500).json({ message: "Error al generar reporte por lugar (MG)", error: error.message });
        }
    },

    lugarAtencionRehabilitacionFisica: async (req, res) => {
        try {
            const { lugar, desde, hasta } = req.params;
            const data = await HistoriaClinicaRFModel.findAll({
                where: { lugar_atencion: lugar, fecha: { [Op.gte]: desde, [Op.lte]: hasta } },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: DiagnosticoModel, as: 'diagnostico' }
                ]
            });
            const filas = data.map(item => ({
                nombre: `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`.trim(),
                motivo: item.diagnostico?.diagnostico || '',
                edad: item.paciente?.edad || ''
            }));
            return generarReporteLugarAtencion(res, { filas, lugar, desde, hasta, subtitulo: 'REHABILITACIÓN FÍSICA' });
        } catch (error) {
            res.status(500).json({ message: "Error al generar reporte por lugar (RF)", error: error.message });
        }
    },

    // ===== 20 PRINCIPALES CAUSAS DE MORBILIDAD - REHABILITACIÓN FÍSICA =====
    morbilidadTerapia: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const mesNombre = nombreDelMes(mes);
            const parametrosRF = await ParametroModel.findOne({ where: { cargo: 'Médico Rehabilitación Física', estado: true } });

            const datos = await HistoriaClinicaRFModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [
                    { model: PacienteModel, as: 'paciente' },
                    { model: DiagnosticoModel, as: 'diagnostico' }
                ]
            });

            // Agrupar por diagnóstico y contar frecuencia (equivalente al groupBy+orderBy de PHP)
            const porDiagnostico = new Map();
            datos.forEach(item => {
                const idDx = item.id_diagnostico;
                if (!porDiagnostico.has(idDx)) {
                    porDiagnostico.set(idDx, { nombre: item.diagnostico?.diagnostico || '', items: [] });
                }
                porDiagnostico.get(idDx).items.push(item);
            });
            const top20 = [...porDiagnostico.values()]
                .sort((a, b) => b.items.length - a.items.length)
                .slice(0, 20);

            const Resultados = [];
            const TotalF = Array(13).fill(0);
            const conteosPorDiagnostico = [];

            top20.forEach((grupo, idx) => {
                const Edad = Array(13).fill(0);
                grupo.items.forEach(item => {
                    const edad = parseFloat(item.paciente?.edad) || 0;
                    const sexo = item.paciente?.sexo;
                    Edad[12]++;
                    if (edad > 0 && edad <= 3) { sexo === 'Hombre' ? Edad[0]++ : Edad[1]++; }
                    if (edad >= 4 && edad <= 12) { sexo === 'Hombre' ? Edad[2]++ : Edad[3]++; }
                    if (edad >= 13 && edad <= 19) { sexo === 'Hombre' ? Edad[4]++ : Edad[5]++; }
                    if (edad >= 20 && edad <= 49) { sexo === 'Hombre' ? Edad[6]++ : Edad[7]++; }
                    if (edad >= 50) { sexo === 'Hombre' ? Edad[8]++ : Edad[9]++; }
                    if (sexo === 'Hombre') Edad[10]++;
                    if (sexo === 'Mujer') Edad[11]++;
                });
                for (let i = 0; i <= 12; i++) TotalF[i] += Edad[i];
                conteosPorDiagnostico.push(Edad[12]);
                Resultados.push([idx + 1, grupo.nombre, ...Edad]);
            });

            const porcentajes = conteosPorDiagnostico.map(c =>
                TotalF[12] > 0 ? Math.round((c / TotalF[12]) * 100 * 100) / 100 : 0
            );

            const doc = crearDocumentoConMembrete({
                titulo: `20 PRINCIPALES CAUSAS DE MORBILIDAD - REHABILITACIÓN FÍSICA\nSEGÚN EDAD Y SEXO - ${mesNombre} ${year}`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=MorbilidadTerapia-${mes}-${year}.pdf`);
            doc.pipe(res);

            const x0 = doc.page.margins.left;
            let y = 105;
            const anchoNum = 24, anchoCausa = 170, anchoAngosta = 32;
            const gruposEdad = ['0-3a', '4-12a', '13-19a', '20-49a', '>=50a'];

            let cx = x0 + anchoNum + anchoCausa;
            doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            doc.rect(cx, y, gruposEdad.length * 2 * anchoAngosta, 14).stroke();
            doc.text('GRUPOS DE EDAD', cx, y + 3, { width: gruposEdad.length * 2 * anchoAngosta, align: 'center' });
            cx += gruposEdad.length * 2 * anchoAngosta;
            doc.rect(cx, y, anchoAngosta * 3, 14).stroke();
            doc.text('TOTALES', cx, y + 3, { width: anchoAngosta * 3, align: 'center' });

            doc.rect(x0, y, anchoNum, 28).stroke();
            doc.text('N°', x0, y + 10, { width: anchoNum, align: 'center' });
            doc.rect(x0 + anchoNum, y, anchoCausa, 28).stroke();
            doc.text('DIAGNÓSTICO', x0 + anchoNum, y + 10, { width: anchoCausa, align: 'center' });

            const y2 = y + 14;
            cx = x0 + anchoNum + anchoCausa;
            for (const g of gruposEdad) {
                doc.rect(cx, y2, anchoAngosta * 2, 14).stroke();
                doc.text(g, cx, y2 + 3, { width: anchoAngosta * 2, align: 'center' });
                cx += anchoAngosta * 2;
            }
            doc.rect(cx, y2, anchoAngosta * 3, 14).stroke();
            doc.text('H / M / %', cx, y2 + 3, { width: anchoAngosta * 3, align: 'center' });

            const y3 = y2 + 14;
            cx = x0 + anchoNum + anchoCausa;
            for (let g = 0; g < gruposEdad.length; g++) {
                dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'H', fontSize: 7 }); cx += anchoAngosta;
                dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'M', fontSize: 7 }); cx += anchoAngosta;
            }
            dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'H', fontSize: 7 }); cx += anchoAngosta;
            dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'M', fontSize: 7 }); cx += anchoAngosta;
            dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: '%', fontSize: 7 });

            y = y3 + 14;
            doc.fontSize(7).font('Helvetica');
            for (let n = 0; n < 20; n++) {
                const item = Resultados[n];
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoNum, h: 14, texto: item ? item[0] : n + 1, fontSize: 7, negrita: false }); cx += anchoNum;
                dibujarCelda(doc, { x: cx, y, w: anchoCausa, h: 14, texto: item ? item[1] : '', fontSize: 6.5, negrita: false, align: 'left' }); cx += anchoCausa;
                if (item) {
                    for (let j = 2; j <= 11; j++) { // Edad[0..9]: 5 grupos x H/M
                        dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: item[j] || '', fontSize: 6.5, negrita: false });
                        cx += anchoAngosta;
                    }
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: item[12] || '', fontSize: 6.5, negrita: false }); cx += anchoAngosta; // TotalH
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: item[13] || '', fontSize: 6.5, negrita: false }); cx += anchoAngosta; // TotalM
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: porcentajes[n] ?? '', fontSize: 6.5, negrita: false });
                } else {
                    for (let j = 0; j < 12; j++) {
                        dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: '', fontSize: 6.5, negrita: false });
                        cx += anchoAngosta;
                    }
                }
                y += 14;
            }

            y += 10;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosRF?.profesion || ''} ${parametrosRF?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar morbilidad de terapia", error: error.message });
        }
    },

    // ===== RECAUDACIÓN DIARIA (MG y Terapia) =====
    // Nota: la plantilla original imprimía una lista partida en dos columnas
    // de 22 filas fijas (pensada para papel físico). Se simplifica a una sola
    // lista clara, sin el límite artificial de 44 registros.
    recaudacionDiarioMedicinaGeneral: async (req, res) => {
        try {
            const { fecha, id } = req.params;
            const clave = process.env.DATOS_PERSONALES_SECRET_KEY;
            const valorMGV1 = await ParametroModel.findOne({ where: { nombres: 'MGV1', estado: true } });
            const valorMGV2 = await ParametroModel.findOne({ where: { nombres: 'MGV2', estado: true } });
            const datos = await RecaudacionModel.findAll({
                where: { fecha, id_rol: id },
                include: [{ model: PacienteModel, as: 'paciente' }]
            });
            return generarReporteRecaudacionDiaria(res, {
                datos, clave, valorTexto1: `${valorMGV1?.valor || ''}`, valorTexto2: `${valorMGV2?.valor || ''}`,
                titulo: 'CONTROL DIARIO DE MEDICINA GENERAL', fecha
            });
        } catch (error) {
            res.status(500).json({ message: "Error al generar recaudación diaria MG", error: error.message });
        }
    },

    recaudacionDiarioTerapia: async (req, res) => {
        try {
            const { fecha, id } = req.params;
            const clave = process.env.DATOS_PERSONALES_SECRET_KEY;
            const valorRFV1 = await ParametroModel.findOne({ where: { nombres: 'RFV1', estado: true } });
            const valorRFV2 = await ParametroModel.findOne({ where: { nombres: 'RFV2', estado: true } });
            const datos = await RecaudacionModel.findAll({
                where: { fecha, id_rol: id },
                include: [{ model: PacienteModel, as: 'paciente' }]
            });
            return generarReporteRecaudacionDiaria(res, {
                datos, clave, valorTexto1: `${valorRFV1?.valor || ''}`, valorTexto2: `${valorRFV2?.valor || ''}`,
                titulo: 'CONTROL DIARIO DE REHABILITACIÓN FÍSICA', fecha
            });
        } catch (error) {
            res.status(500).json({ message: "Error al generar recaudación diaria de terapia", error: error.message });
        }
    },

    // ===== RECAUDACIÓN MENSUAL (matriz por día del mes) =====
    recaudacionMensual: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const mesNombre = nombreDelMes(mes);
            const clave = process.env.DATOS_PERSONALES_SECRET_KEY;

            const parametrosecre = await ParametroModel.findOne({ where: { cargo: 'Secretario/a', estado: true } });
            const valorRFV1 = await ParametroModel.findOne({ where: { nombres: 'RFV1', estado: true } });
            const valorRFV2 = await ParametroModel.findOne({ where: { nombres: 'RFV2', estado: true } });
            const valorMGV1 = await ParametroModel.findOne({ where: { nombres: 'MGV1', estado: true } });
            const valorMGV2 = await ParametroModel.findOne({ where: { nombres: 'MGV2', estado: true } });

            const dato = await RecaudacionModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [{ model: RolModel, as: 'rol' }]
            });
            const egre = await EgresoModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                }
            });
            const egresos = egre.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);

            // result[dia] = [exoneraMG, cobroMG_V1, cobroMG_V2, montoMG, exoneraRF, cobroRF_V1, cobroRF_V2, montoRF]
            const dias = {};
            for (let i = 1; i <= 31; i++) dias[i] = Array(10).fill(0);

            dato.forEach(item => {
                const diaMes = parseInt(item.fecha.split('-')[2], 10);
                const fila = dias[diaMes];
                if (!fila) return;

                let valorNum = 0;
                try {
                    valorNum = parseFloat(CryptoService.descifrarDatos(item.valor_enc, clave)) || 0;
                } catch (e) { /* si no se puede descifrar, se cuenta como 0 */ }

                if (item.rol?.rol === 'Medicina General') {
                    fila[1]++; // total atendidos MG
                    if (item.exonera) { fila[0]++; }
                    else if (valorNum === parseFloat(valorMGV1?.valor)) { fila[2]++; fila[4] += valorNum; }
                    else if (valorNum === parseFloat(valorMGV2?.valor)) { fila[3]++; fila[4] += valorNum; }
                } else if (item.rol?.rol === 'Rehabilitación Física') {
                    fila[6]++; // total atendidos RF
                    if (item.exonera) { fila[5]++; }
                    else if (valorNum === parseFloat(valorRFV2?.valor)) { fila[7]++; fila[9] += valorNum; }
                    else { fila[8]++; fila[9] += valorNum; }
                }
            });

            const totalGeneral = Array(10).fill(0);
            for (let i = 1; i <= 31; i++) for (let c = 0; c < 10; c++) totalGeneral[c] += dias[i][c];
            const recaudacion = totalGeneral[4] + totalGeneral[9];
            const saldo = recaudacion - egresos;

            const doc = crearDocumentoConMembrete({
                titulo: `RECAUDACIÓN MENSUAL\n${mesNombre} ${year}`,
                orientacion: 'landscape',
                tamano: 'A4'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=RecaudacionMensual-${mes}-${year}.pdf`);
            doc.pipe(res);

            const x0 = doc.page.margins.left;
            const anchoColumnas = [30, 55, 55, 55, 65, 55, 55, 55, 65, 65];
            const filas = [
                {
                    altura: 26,
                    celdas: [
                        { texto: 'DÍA', fontSize: 7 },
                        { texto: 'MG Exonerados', fontSize: 6.5 }, { texto: `MG ${valorMGV1?.valor || ''}`, fontSize: 6.5 },
                        { texto: `MG ${valorMGV2?.valor || ''}`, fontSize: 6.5 }, { texto: 'Monto MG', fontSize: 6.5 },
                        { texto: 'RF Exonerados', fontSize: 6.5 }, { texto: `RF ${valorRFV1?.valor || ''}`, fontSize: 6.5 },
                        { texto: `RF ${valorRFV2?.valor || ''}`, fontSize: 6.5 }, { texto: 'Monto RF', fontSize: 6.5 },
                    ]
                }
            ];
            for (let i = 1; i <= 31; i++) {
                const f = dias[i];
                filas.push({
                    celdas: [
                        { texto: i, negrita: true, fontSize: 7 },
                        { texto: f[0] || '', negrita: false }, { texto: f[2] || '', negrita: false },
                        { texto: f[3] || '', negrita: false }, { texto: f[4] ? f[4].toFixed(2) : '', negrita: false },
                        { texto: f[5] || '', negrita: false }, { texto: f[7] || '', negrita: false },
                        { texto: f[8] || '', negrita: false }, { texto: f[9] ? f[9].toFixed(2) : '', negrita: false },
                    ]
                });
            }
            filas.push({
                celdas: [
                    { texto: 'TOTAL', color: COLOR_VERDE, fontSize: 8 },
                    { texto: totalGeneral[0], color: COLOR_VERDE }, { texto: totalGeneral[2], color: COLOR_VERDE },
                    { texto: totalGeneral[3], color: COLOR_VERDE }, { texto: totalGeneral[4].toFixed(2), color: COLOR_VERDE },
                    { texto: totalGeneral[5], color: COLOR_VERDE }, { texto: totalGeneral[7], color: COLOR_VERDE },
                    { texto: totalGeneral[8], color: COLOR_VERDE }, { texto: totalGeneral[9].toFixed(2), color: COLOR_VERDE },
                ]
            });

            const yFinal = dibujarTabla(doc, { x: x0, y: 100, anchoColumnas, alturaFila: 14, filas });

            doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
            doc.text(`Recaudación total: $${recaudacion.toFixed(2)}`, x0, yFinal + 20);
            doc.text(`Egresos: $${egresos.toFixed(2)}`, x0, yFinal + 34);
            doc.text(`Saldo: $${saldo.toFixed(2)}`, x0, yFinal + 48);
            doc.fontSize(9).font('Helvetica').text(`${parametrosecre?.profesion || ''} ${parametrosecre?.nombres || ''}`, x0, yFinal + 70);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar recaudación mensual", error: error.message });
        }
    },

    // ===== RECETA MÉDICA (formato A5, sobre papel institucional preimpreso) =====
    receta: async (req, res) => {
        try {
            const { color, nombre, peso, talla, ta, edad, fecha, rp, pres } = req.params;
            const [anio, mes, dia] = fecha.split('-');
            const mesNombre = nombreDelMes(mes);

            const listaRp = rp.split('.').filter(Boolean);
            const listaPres = pres.split('.').filter(Boolean);
            // Replica la lógica original: de cada ítem "Medicamento-presentación" se
            // arma una etiqueta combinada para la columna izquierda del recetario.
            const complementos = listaRp.map(item => {
                const partes = item.split('-');
                return `${partes[0] || ''}${partes[1] || ''}`;
            });

            const fondo = parseInt(color, 10) === 2
                ? path.join(__dirname, '..', 'assets', 'receta2.jpg')
                : path.join(__dirname, '..', 'assets', 'receta1.jpg');

            const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Receta-${nombre}-${fecha}.pdf`);
            doc.pipe(res);

            try { doc.image(fondo, 0, 0, { width: doc.page.width, height: doc.page.height }); } catch (e) { /* sin fondo si falta el archivo */ }

            doc.fontSize(9).font('Helvetica').fillColor('black');
            doc.text(nombre, 52, 96);
            doc.text(peso, 40, 114);
            doc.text(talla, 108, 114);
            doc.text(ta, 172, 114);
            doc.text(edad, 238, 114);
            doc.text(dia, 55, 128);
            doc.text(mesNombre, 125, 128);
            doc.text(anio.slice(-2), 232, 128);

            let y = 156;
            for (let i = 0; i < Math.max(listaRp.length, listaPres.length); i++) {
                if (listaPres[i] !== undefined) {
                    doc.font('Helvetica-Bold').text(`${i + 1})`, 310, y, { continued: true }).font('Helvetica').text(` ${listaPres[i]}`);
                }
                if (i > 0 && complementos[i - 1] !== undefined) {
                    doc.font('Helvetica-Bold').text(`${i})`, 20, y, { continued: true }).font('Helvetica').text(` ${complementos[i - 1]}`);
                }
                y += 16;
            }

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar la receta", error: error.message });
        }
    },

    // ===== RECETA DE FARMACIA (entrega de medicamentos, formato A5) =====
    recetapdf: async (req, res) => {
        try {
            const { id_entrega } = req.params;
            const entrega = await EntregaModel.findOne({ where: { id_entrega, entregado: false }, include: [{ model: PacienteModel, as: 'paciente' }] });
            if (!entrega) {
                return res.status(202).json({ mensaje: "No existen datos o es una receta ya entregada", code: '202' });
            }
            const medicamentos = await DetalleEntregaModel.findAll({
                where: { id_entrega },
                include: [{ model: MedicamentoModel, as: 'medicamento' }]
            });
            return generarRecetaFarmacia(res, { entrega, medicamentos, colorFijo: 1 });
        } catch (error) {
            res.status(500).json({ message: "Error al generar recetapdf", error: error.message });
        }
    },

    recetafinal: async (req, res) => {
        try {
            const { id_entrega } = req.params;
            const entrega = await EntregaModel.findOne({ where: { id_entrega }, include: [{ model: PacienteModel, as: 'paciente' }] });
            if (!entrega) {
                return res.status(202).json({ mensaje: "No existen datos o la receta no se ha guardado correctamente", code: '202' });
            }
            const medicamentos = await DetalleEntregaModel.findAll({
                where: { id_entrega },
                include: [{ model: MedicamentoModel, as: 'medicamento' }]
            });
            const colorAleatorio = Math.floor(Math.random() * 4) + 1; // 1-4, igual que random_int(1,4) del PHP
            return generarRecetaFarmacia(res, { entrega, medicamentos, colorFijo: colorAleatorio });
        } catch (error) {
            res.status(500).json({ message: "Error al generar recetafinal", error: error.message });
        }
    },

    // 2. ReportePacientesAnual
    reportePacientesAnual: async (req, res) => {
        try {
            const { year } = req.params;

            const datosMG = await HistoriaClinicaMGModel.findAll({
                where: sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10)),
                include: [{ model: PacienteModel, as: 'paciente' }]
            });

            const datosRF = await HistoriaClinicaRFModel.findAll({
                where: sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10)),
                include: [{ model: PacienteModel, as: 'paciente' }]
            });

            const parametrosecre = await ParametroModel.findOne({
                where: { cargo: 'Médico General', estado: true }
            });

            const parametrosRF = await ParametroModel.findOne({
                where: { cargo: 'Médico Rehabilitación Física', estado: true }
            });

            const MGM = Array(13).fill(0);
            const MGH = Array(13).fill(0);
            const RFM = Array(13).fill(0);
            const RFH = Array(13).fill(0);
            const STH = Array(13).fill(0);
            const STM = Array(13).fill(0);
            const Total = Array(13).fill(0);

            datosMG.forEach(item => {
                if (item.fecha) {
                    const valores = item.fecha.split('-');
                    if (valores.length === 3) {
                        const mesIndex = parseInt(valores[1], 10) - 1;
                        if (mesIndex >= 0 && mesIndex < 12) {
                            if (item.paciente && item.paciente.sexo === "Hombre") MGH[mesIndex]++;
                            else if (item.paciente && item.paciente.sexo === "Mujer") MGM[mesIndex]++;
                        }
                    }
                }
            });

            datosRF.forEach(item => {
                if (item.fecha) {
                    const valores = item.fecha.split('-');
                    if (valores.length === 3) {
                        const mesIndex = parseInt(valores[1], 10) - 1;
                        if (mesIndex >= 0 && mesIndex < 12) {
                            if (item.paciente && item.paciente.sexo === "Hombre") RFH[mesIndex]++;
                            else if (item.paciente && item.paciente.sexo === "Mujer") RFM[mesIndex]++;
                        }
                    }
                }
            });

            for (let i = 0; i < 12; i++) {
                STH[i] += MGH[i] + RFH[i];
                STM[i] += MGM[i] + RFM[i];
                Total[i] += STH[i] + STM[i];

                MGH[12] += MGH[i];
                RFH[12] += RFH[i];
                MGM[12] += MGM[i];
                RFM[12] += RFM[i];

                STH[12] += STH[i];
                STM[12] += STM[i];
                Total[12] += Total[i];
            }

            // --- Generación del PDF real (antes solo se devolvían los números en JSON) ---
            const doc = crearDocumentoConMembrete({
                titulo: `TOTAL DE PACIENTES ATENDIDOS EN LA UNIDAD DE ASISTENCIA SOCIAL DEL GAD MUNICIPAL DEL CANTÓN JUNÍN EN LAS ÁREAS DE MEDICINA GENERAL Y REHABILITACIÓN FÍSICA EN EL AÑO ${year}.`
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=ReportePacientesAnual-${year}.pdf`);
            doc.pipe(res);

            const anchoColumnas = [110, 45, 45, 45, 45, 45, 45, 130];
            const x = doc.page.margins.left;
            let y = 105;

            const filas = [
                {
                    altura: 30,
                    celdas: [
                        { texto: year, colspan: 1 },
                        { texto: 'MEDICINA GENERAL', colspan: 2 },
                        { texto: 'REHABILITACIÓN FÍSICA', colspan: 2 },
                        { texto: 'SUBTOTAL', colspan: 2 },
                        { texto: 'TOTAL DE PACIENTES ATENDIDOS MG Y RF', colspan: 1, fontSize: 7 }
                    ]
                },
                {
                    altura: 16,
                    celdas: [
                        { texto: 'MESES' },
                        { texto: 'H' }, { texto: 'M' },
                        { texto: 'H' }, { texto: 'M' },
                        { texto: 'H' }, { texto: 'M' },
                        { texto: '' }
                    ]
                }
            ];

            for (let i = 0; i < 12; i++) {
                filas.push({
                    celdas: [
                        { texto: nombreDelMes(i + 1), negrita: true },
                        { texto: MGH[i] || '', negrita: false },
                        { texto: MGM[i] || '', negrita: false },
                        { texto: RFH[i] || '', negrita: false },
                        { texto: RFM[i] || '', negrita: false },
                        { texto: STH[i] || '', negrita: false },
                        { texto: STM[i] || '', negrita: false },
                        { texto: Total[i] || '', negrita: false }
                    ]
                });
            }

            filas.push({
                altura: 26,
                celdas: [
                    { texto: 'TOTAL DE PACIENTES ATENDIDOS', fontSize: 8 },
                    { texto: MGH[12], color: COLOR_VERDE },
                    { texto: MGM[12], color: COLOR_VERDE },
                    { texto: RFH[12], color: COLOR_VERDE },
                    { texto: RFM[12], color: COLOR_VERDE },
                    { texto: STH[12], color: COLOR_VERDE },
                    { texto: STM[12], color: COLOR_VERDE },
                    { texto: Total[12], color: COLOR_VERDE, fontSize: 11 }
                ]
            });

            y = dibujarTabla(doc, { x, y, anchoColumnas, alturaFila: 18, filas });

            // Firmas
            const yFirmas = y + 60;
            doc.fontSize(10).font('Helvetica').fillColor('black');
            doc.text(`${parametrosecre?.profesion || ''} ${parametrosecre?.nombres || ''}`, x + 20, yFirmas);
            doc.text('Medicina General.', x + 40, yFirmas + 14);

            const anchoTotal = anchoColumnas.reduce((a, b) => a + b, 0);
            doc.text(`${parametrosRF?.profesion || ''} ${parametrosRF?.nombres || ''}`, x + anchoTotal - 220, yFirmas);
            doc.text('Rehabilitación Física.', x + anchoTotal - 200, yFirmas + 14);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al procesar el reporte anual", error: error.message });
        }
    },

    // 4. ReportePacientesMensual
    reportePacientesMensual: async (req, res) => {
        try {
            const { mes, year } = req.params;

            const parametrosecre = await ParametroModel.findOne({ where: { cargo: 'Médico General', estado: true } });
            const parametrosRF = await ParametroModel.findOne({ where: { cargo: 'Médico Rehabilitación Física', estado: true } });

            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const mesNombre = meses[parseInt(mes, 10) - 1]?.toUpperCase() || "";

            const MG = await HistoriaClinicaMGModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [{ model: PacienteModel, as: 'paciente' }]
            });

            const datosMG = MG.length;
            let MGcontH = 0, MGcontM = 0;
            MG.forEach(item => {
                if (item.paciente && item.paciente.sexo === 'Hombre') MGcontH++;
                else MGcontM++;
            });

            const RF = await HistoriaClinicaRFModel.findAll({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [{ model: PacienteModel, as: 'paciente' }]
            });

            const datosRF = RF.length;
            let RFcontH = 0, RFcontM = 0;
            RF.forEach(item => {
                if (item.paciente && item.paciente.sexo === 'Hombre') RFcontH++;
                else RFcontM++;
            });

            const TotalH = MGcontH + RFcontH;
            const TotalM = MGcontM + RFcontM;
            const Total = datosMG + datosRF;

            return res.json({
                MGcontH, MGcontM, parametrosecre, parametrosRF, datosMG,
                RFcontH, RFcontM, datosRF, TotalH, TotalM, Total, mes: mesNombre, Year: year
            });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener reporte mensual", error: error.message });
        }
    },

    // 6. MorbilidadMedicinaGeneral
    morbilidadMedicinaGeneral: async (req, res) => {
        try {
            const { mes, year } = req.params;
            const parametrosecre = await ParametroModel.findOne({ where: { cargo: 'Médico General', estado: true } });

            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const mesNombre = meses[parseInt(mes, 10) - 1]?.toUpperCase() || "";

            const MMG = await HistoriaClinicaMGModel.findAll({
                attributes: ['id_enfermedad'],
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                        sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10))
                    ]
                },
                include: [{
                    model: EnfermedadModel,
                    as: 'enfermedad',
                    where: { tipo_enfermedad: 'MORBILIDAD' }
                }],
                group: ['id_enfermedad', 'enfermedad.id_enfermedad'],
                order: [[sequelize.fn('COUNT', sequelize.col('*')), 'DESC']],
                limit: 20
            });

            let Result = [];
            let ContgruposEdadCont = [];
            let total = Array(17).fill(0);
            let n = 1;

            for (const item of MMG) {
                const Pacientes = await HistoriaClinicaMGModel.findAll({
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('fecha')), parseInt(mes, 10)),
                            sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('fecha')), parseInt(year, 10)),
                            { id_enfermedad: item.id_enfermedad }
                        ]
                    },
                    include: [{ model: PacienteModel, as: 'paciente' }]
                });

                const top20 = item.enfermedad?.enfermedad || "";
                let ContgruposEdad = Array(18).fill(0);

                Pacientes.forEach(item2 => {
                    if (!item2.paciente) return;
                    const edad = parseFloat(item2.paciente.edad);
                    const sexo = item2.paciente.sexo;

                    if (edad <= 0.028) {
                        if (sexo === 'Hombre') ContgruposEdad[0]++; else ContgruposEdad[1]++;
                    } else if (edad >= 0.029 && edad < 1) {
                        if (sexo === 'Hombre') ContgruposEdad[2]++; else ContgruposEdad[3]++;
                    } else if (edad >= 1 && edad <= 4) {
                        if (sexo === 'Hombre') ContgruposEdad[4]++; else ContgruposEdad[5]++;
                    } else if (edad >= 5 && edad <= 14) {
                        if (sexo === 'Hombre') ContgruposEdad[6]++; else ContgruposEdad[7]++;
                    } else if (edad >= 15 && edad <= 49) {
                        if (sexo === 'Hombre') ContgruposEdad[8]++; else ContgruposEdad[9]++;
                    } else if (edad >= 50 && edad <= 64) {
                        if (sexo === 'Hombre') ContgruposEdad[10]++; else ContgruposEdad[11]++;
                    } else if (edad >= 65) {
                        if (sexo === 'Hombre') ContgruposEdad[12]++; else ContgruposEdad[13]++;
                    }
                });

                ContgruposEdad[14] = ContgruposEdad[0] + ContgruposEdad[2] + ContgruposEdad[4] + ContgruposEdad[6] + ContgruposEdad[8] + ContgruposEdad[10] + ContgruposEdad[12];
                ContgruposEdad[15] = ContgruposEdad[1] + ContgruposEdad[3] + ContgruposEdad[5] + ContgruposEdad[7] + ContgruposEdad[9] + ContgruposEdad[11] + ContgruposEdad[13];
                ContgruposEdad[16] = ContgruposEdad[14] + ContgruposEdad[15];

                for (let i = 0; i <= 16; i++) {
                    total[i] += ContgruposEdad[i];
                }

                ContgruposEdadCont.push(ContgruposEdad[16]);

                let limpiadoEdad = ContgruposEdad.map((val, idx) => (val === 0 && idx <= 15) ? "" : val);

                Result.push([n, top20, limpiadoEdad]);
                n++;
            }

            let porcentajes = ContgruposEdadCont.map(totalFila => {
                if (total[16] === 0) return 0;
                return Math.round((totalFila / total[16]) * 100 * 100) / 100;
            });

            // --- Generación del PDF real ---
            const doc = crearDocumentoConMembrete({
                titulo: `REGISTRO DE LAS 20 PRINCIPALES CAUSAS DE MORBILIDAD EN MEDICINA GENERAL\nSEGÚN EDAD Y SEXO - ${mesNombre} ${year}`,
                orientacion: 'landscape',
                tamano: 'A3'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=MorbilidadMedicinaGeneral-${mes}-${year}.pdf`);
            doc.pipe(res);

            const x0 = doc.page.margins.left;
            let y = 105;
            const anchoNum = 24, anchoCausa = 150, anchoAngosta = 30;
            const gruposEdad = ['<28d', '29-365d', '1-4a', '5-14a', '15-49a', '50-64a', '65+a'];

            // Encabezado
            let cx = x0 + anchoNum + anchoCausa;
            doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_VERDE);
            doc.rect(cx, y, gruposEdad.length * 2 * anchoAngosta, 14).stroke();
            doc.text('GRUPOS DE EDAD', cx, y + 3, { width: gruposEdad.length * 2 * anchoAngosta, align: 'center' });
            cx += gruposEdad.length * 2 * anchoAngosta;
            doc.rect(cx, y, anchoAngosta * 2, 14).stroke();
            doc.text('TOTAL', cx, y + 3, { width: anchoAngosta * 2, align: 'center' });

            doc.rect(x0, y, anchoNum, 28).stroke();
            doc.text('N°', x0, y + 10, { width: anchoNum, align: 'center' });
            doc.rect(x0 + anchoNum, y, anchoCausa, 28).stroke();
            doc.text('CAUSAS', x0 + anchoNum, y + 10, { width: anchoCausa, align: 'center' });

            const y2 = y + 14;
            cx = x0 + anchoNum + anchoCausa;
            for (const g of gruposEdad) {
                doc.rect(cx, y2, anchoAngosta * 2, 14).stroke();
                doc.text(g, cx, y2 + 3, { width: anchoAngosta * 2, align: 'center' });
                cx += anchoAngosta * 2;
            }
            doc.rect(cx, y2, anchoAngosta * 2, 14).stroke();
            doc.text('Total / %', cx, y2 + 3, { width: anchoAngosta * 2, align: 'center' });

            const y3 = y2 + 14;
            cx = x0 + anchoNum + anchoCausa;
            doc.fontSize(6.5);
            for (let g = 0; g < gruposEdad.length; g++) {
                dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'H', fontSize: 7 }); cx += anchoAngosta;
                dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'M', fontSize: 7 }); cx += anchoAngosta;
            }
            dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: 'Total', fontSize: 6.5 }); cx += anchoAngosta;
            dibujarCelda(doc, { x: cx, y: y3, w: anchoAngosta, h: 14, texto: '%', fontSize: 7 });

            y = y3 + 14;
            doc.fontSize(7).font('Helvetica');
            for (let n = 0; n < 20; n++) {
                const item = Result[n];
                cx = x0;
                dibujarCelda(doc, { x: cx, y, w: anchoNum, h: 14, texto: item ? item[0] : n + 1, fontSize: 7, negrita: false }); cx += anchoNum;
                dibujarCelda(doc, { x: cx, y, w: anchoCausa, h: 14, texto: item ? item[1] : '', fontSize: 6.5, negrita: false, align: 'left' }); cx += anchoCausa;
                if (item) {
                    const valoresEdad = item[2]; // 17 valores: 14 H/M por grupo + totalH + totalM + total general
                    for (let j = 0; j < 14; j++) {
                        dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: valoresEdad[j] || '', fontSize: 6.5, negrita: false });
                        cx += anchoAngosta;
                    }
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: valoresEdad[16] || '', fontSize: 6.5, negrita: false }); cx += anchoAngosta;
                    dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: porcentajes[n] ?? '', fontSize: 6.5, negrita: false });
                } else {
                    for (let j = 0; j < 16; j++) {
                        dibujarCelda(doc, { x: cx, y, w: anchoAngosta, h: 14, texto: '', fontSize: 6.5, negrita: false });
                        cx += anchoAngosta;
                    }
                }
                y += 14;
            }

            y += 10;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
            doc.text(`${parametrosecre?.profesion || ''} ${parametrosecre?.nombres || ''}`, x0 + 60, y);
            doc.fontSize(8).font('Helvetica').text('DEPARTAMENTO DE ASISTENCIA SOCIAL', x0 + 60, y + 12);

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error en el reporte de morbilidad", error: error.message });
        }
    },

    // GET /reportes/aviso-privacidad/:id_paciente
    // LOPDP: aviso de privacidad imprimible, entregado al paciente al
    // registrarse, explicando en lenguaje simple qué datos se recogen,
    // para qué, y bajo qué protección (cifrado asimétrico).
    avisoPrivacidad: async (req, res) => {
        try {
            const { id_paciente } = req.params;
            const paciente = await PacienteModel.findByPk(id_paciente);
            if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });

            const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 60, right: 60 } });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=AvisoPrivacidad.pdf`);
            doc.pipe(res);

            doc.fontSize(16).font('Helvetica-Bold').text('Gobierno Autónomo Descentralizado Municipal del Cantón Junín', { align: 'center' });
            doc.fontSize(13).font('Helvetica-Bold').text('Unidad de Asistencia Social — Patronato', { align: 'center' });
            doc.moveDown(1);
            doc.fontSize(14).font('Helvetica-Bold').text('AVISO DE PRIVACIDAD Y CONSENTIMIENTO INFORMADO', { align: 'center' });
            doc.moveDown(1.5);

            doc.fontSize(11).font('Helvetica-Bold').text(`Paciente: `, { continued: true }).font('Helvetica').text(`${paciente.nombres} ${paciente.apellidos}`);
            doc.font('Helvetica-Bold').text(`Fecha: `, { continued: true }).font('Helvetica').text(new Date().toISOString().split('T')[0]);
            doc.moveDown(1);

            doc.fontSize(10).font('Helvetica').text(
                'El Patronato del GAD Municipal del Cantón Junín recopila y trata sus datos personales y de salud ' +
                '(nombre, cédula, contacto, historia clínica) con la única finalidad de brindarle atención médica y ' +
                'de rehabilitación física, gestionar sus citas, y llevar el registro administrativo correspondiente.',
                { align: 'justify' }
            );
            doc.moveDown(0.8);

            doc.font('Helvetica-Bold').text('Protección de sus datos:');
            doc.font('Helvetica').text(
                'Su cédula, teléfono y correo se almacenan cifrados. El contenido de su historia clínica se protege ' +
                'mediante cifrado asimétrico (ECDH) y firma digital del profesional que le atiende, de forma que ' +
                'nadie pueda leerlo ni alterarlo sin autorización — ni siquiera el personal administrativo del sistema.',
                { align: 'justify' }
            );
            doc.moveDown(0.8);

            doc.font('Helvetica-Bold').text('Sus derechos:');
            doc.font('Helvetica').text(
                'Usted puede solicitar en cualquier momento, de forma gratuita: acceder a sus datos, solicitar su ' +
                'corrección, pedir su eliminación cuando corresponda, u oponerse a un tratamiento específico. Para ' +
                'ejercer estos derechos, acérquese a Secretaría del Patronato con su cédula.',
                { align: 'justify' }
            );
            doc.moveDown(0.8);

            doc.font('Helvetica-Bold').text('Conservación:');
            doc.font('Helvetica').text(
                'Sus datos se conservan mientras dure la relación de atención con el Patronato y por el tiempo ' +
                'adicional que exija la normativa de salud vigente.',
                { align: 'justify' }
            );
            doc.moveDown(2);

            doc.font('Helvetica-Bold').text('Consentimiento:');
            doc.font('Helvetica').text(
                `Al registrarse, ${paciente.nombres} ${paciente.apellidos} (o su representante) autorizó el ` +
                'tratamiento de sus datos personales y de salud para los fines aquí descritos, conforme a la Ley ' +
                'Orgánica de Protección de Datos Personales del Ecuador.',
                { align: 'justify' }
            );
            doc.moveDown(3);

            doc.fontSize(10).text('_______________________________', { align: 'left' });
            doc.text('Firma del paciente o representante');

            doc.end();
        } catch (error) {
            res.status(500).json({ message: "Error al generar el aviso de privacidad", error: error.message });
        }
    }
};