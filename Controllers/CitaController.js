import { CitaModel, PacienteModel, TurnoModel, RolModel } from '../Models/index.js';
import { CryptoService } from '../utils/cryptoService.js';

function obtenerClavePersonal() {
    if (!process.env.DATOS_PERSONALES_SECRET_KEY) {
        throw new Error('DATOS_PERSONALES_SECRET_KEY no está configurada en las variables de entorno.');
    }
    return process.env.DATOS_PERSONALES_SECRET_KEY;
}

async function buscarPacientePorCedula(cedula) {
    const clave = obtenerClavePersonal();
    const hash = CryptoService.calcularIndiceCiego(cedula, clave);
    return PacienteModel.findOne({ where: { cedula_hash: hash } });
}

export const CitaController = {
    async index(req, res) {
        try {
            const datos = await CitaModel.findAll({
                include: [{ model: TurnoModel, as: 'turno', include: [{ model: RolModel, as: 'rol' }] }]
            });
            const num_rows = datos.length;
            if (num_rows !== 0) {
                return res.status(200).json({ result: datos });
            } else {
                return res.status(200).json({ mensaje: "No hay registros", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async validarMGandRF(req, res) {
        try {
            const { especialidad, fechaActual } = req.params;

            const datos = await CitaModel.findAll({
                where: { fecha: fechaActual },
                include: [{ model: TurnoModel, as: 'turno' }]
            });
            const roles = await RolModel.findOne({ where: { rol: especialidad } });

            if (!roles) {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }

            const idrol = roles.id_rol;
            const data = [];
            const cont = datos.length;

            if (cont > 0) {
                for (const tur of datos) {
                    if (tur.turno && tur.turno.id_rol === idrol) {
                        data.push(tur);
                    }
                }
                const contD = data.length;
                if (contD > 0) {
                    data.sort((a, b) => a.turno.hora.localeCompare(b.turno.hora));
                }
                return res.status(200).json({ result: data, code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async store(req, res) {
        try {
            let edad = 0;
            const { nombres, cedula, fecha, id_turno, abono } = req.body;

            let abonoValue = (abono === "DOADBA");
            let estado = 0;

            const datosP = await buscarPacientePorCedula(cedula);

            if (datosP !== null) {
                estado = 1;
                const hoy = fecha;
                const valoresH = hoy.split('-');
                const ahora_dia = parseInt(valoresH[2]);
                const ahora_mes = parseInt(valoresH[1]);
                const ahora_ano = parseInt(valoresH[0]);

                const cumpleanos = datosP.fecha_nacimiento;
                const valoresC = String(cumpleanos).split('-');
                const ano = parseInt(valoresC[0]);
                const mes = parseInt(valoresC[1]);
                const dia = parseInt(valoresC[2]);

                edad = ahora_ano - ano;
                if (ahora_mes < mes) {
                    edad--;
                }
                if ((mes === ahora_mes) && (ahora_dia < dia)) {
                    edad--;
                }

                let meses = 0;
                if (ahora_mes > mes && dia > ahora_dia) {
                    meses = ahora_mes - mes - 1;
                } else if (ahora_mes > mes) {
                    meses = ahora_mes - mes;
                }
                if (ahora_mes < mes && dia < ahora_dia) {
                    meses = 12 - (mes - ahora_mes);
                } else if (ahora_mes < mes) {
                    meses = 12 - (mes - ahora_mes + 1);
                }
                if (ahora_mes === mes && dia > ahora_dia) {
                    meses = 11;
                }

                let dias = 0;
                if (ahora_dia > dia) {
                    dias = ahora_dia - dia;
                }
                if (ahora_dia < dia) {
                    const ultimoDiaMes = new Date(ahora_ano, ahora_mes, 0).getDate();
                    dias = ultimoDiaMes - (dia - ahora_dia);
                }

                let edadFinal;
                if (edad === 0 && meses === 0) {
                    edadFinal = `0.0${dias}`;
                } else if (edad === 0 && meses !== 0) {
                    edadFinal = `0.${meses}`;
                } else {
                    edadFinal = edad.toString();
                }
                edad = edadFinal;
                await PacienteModel.update({ edad: edadFinal }, { where: { id_paciente: datosP.id_paciente } });
            } else {
                estado = 0;
            }

            await CitaModel.create({
                nombres,
                cedula,
                fecha,
                id_turno,
                abono: abonoValue,
                estado
            });

            return res.status(201).json({ result: "Datos guardados", code: '201', valor: edad });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async show(req, res) {
        try {
            const { id } = req.params;
            const datos = await CitaModel.findOne({
                where: { id_cita: id },
                include: [{ model: TurnoModel, as: 'turno', include: [{ model: RolModel, as: 'rol' }] }]
            });

            if (datos !== null) {
                return res.status(200).json({ result: datos, code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async validarHora(req, res) {
        try {
            const { fecha, tipo } = req.params;
            const datos = await CitaModel.findAll({ where: { fecha }, include: [{ model: TurnoModel, as: 'turno' }] });
            const turno = await TurnoModel.findAll({
                where: { estado: true },
                include: [{ model: RolModel, as: 'rol' }],
                order: [['hora', 'ASC']]
            });
            const roles = await RolModel.findOne({ where: { rol: tipo } });

            if (!roles) return res.status(200).json({ result: "Sin Turnos ", code: '202' });
            const idrol = roles.id_rol;

            const turnoFiltrado = [];
            for (const tur of turno) {
                if (tipo === "Rehabilitación Física") {
                    if (tur.id_rol === idrol) {
                        let pase = 0;
                        let excluir = false;
                        for (const cita of datos) {
                            if (tur.id_turno === cita.id_turno) {
                                pase++;
                            }
                            if (pase === tur.amount) {
                                excluir = true;
                                break;
                            }
                        }
                        if (!excluir) turnoFiltrado.push(tur);
                    }
                } else {
                    if (tur.id_rol === idrol) {
                        let excluir = false;
                        for (const cita of datos) {
                            if (tur.id_turno === cita.id_turno) {
                                excluir = true;
                                break;
                            }
                        }
                        if (!excluir) turnoFiltrado.push(tur);
                    }
                }
            }

            const turnoVal = [];
            let posicion2 = 0;

            const ahoraBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
            ahoraBogota.setHours(ahoraBogota.getHours() + 1);

            const horaActual = ahoraBogota.getHours();
            const fechaActualStr = ahoraBogota.toISOString().split('T')[0];

            if (fecha === fechaActualStr) {
                for (const item of turnoFiltrado) {
                    const horaminDB = item.hora.split(':');
                    const horaDB = parseInt(horaminDB[0]);

                    if (horaActual <= horaDB) {
                        turnoVal[posicion2] = item;
                        posicion2++;
                    } else {
                        turnoVal[posicion2] = item;
                        posicion2++;
                    }
                }
            } else {
                return res.status(200).json({ result: turnoFiltrado, code: '201' });
            }

            if (turnoVal.length !== 0) {
                return res.status(200).json({ result: turnoVal, code: '201' });
            } else {
                return res.status(200).json({ result: "Sin Turnos ", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async validarHoraUser(req, res) {
        try {
            const { fecha, tipo } = req.params;
            const datos = await CitaModel.findAll({ where: { fecha }, include: [{ model: TurnoModel, as: 'turno' }] });
            const turno = await TurnoModel.findAll({
                where: { estado: true },
                include: [{ model: RolModel, as: 'rol' }],
                order: [['hora', 'ASC']]
            });
            const roles = await RolModel.findOne({ where: { rol: tipo } });

            if (!roles) return res.status(200).json({ result: "Sin Turnos ", code: '202' });
            const idrol = roles.id_rol;

            const turnoFiltrado = [];
            for (const tur of turno) {
                if (tipo === "Rehabilitación Física") {
                    if (tur.id_rol === idrol) {
                        let pase = 0;
                        let excluir = false;
                        for (const cita of datos) {
                            if (tur.id_turno === cita.id_turno) {
                                pase++;
                            }
                            if (pase === tur.amount) {
                                excluir = true;
                                break;
                            }
                        }
                        if (!excluir) turnoFiltrado.push(tur);
                    }
                } else {
                    if (tur.id_rol === idrol) {
                        let excluir = false;
                        for (const cita of datos) {
                            if (tur.id_turno === cita.id_turno) {
                                excluir = true;
                                break;
                            }
                        }
                        if (!excluir) turnoFiltrado.push(tur);
                    }
                }
            }

            const turnoVal = [];
            let posicion2 = 0;

            const ahoraBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
            ahoraBogota.setHours(ahoraBogota.getHours() + 1);

            const horaActual = ahoraBogota.getHours();
            const minActual = ahoraBogota.getMinutes();
            const fechaActualStr = ahoraBogota.toISOString().split('T')[0];

            if (fecha === fechaActualStr) {
                for (const item of turnoFiltrado) {
                    const horaminDB = item.hora.split(':');
                    const horaDB = parseInt(horaminDB[0]);
                    const minDB = parseInt(horaminDB[1]);

                    if (horaActual <= horaDB) {
                        if ((horaDB - horaActual) <= 1) {
                            if (minActual <= minDB) {
                                turnoVal[posicion2] = item;
                                posicion2++;
                            }
                        } else {
                            turnoVal[posicion2] = item;
                            posicion2++;
                        }
                    }
                }
            } else {
                return res.status(200).json({ result: turnoFiltrado, code: '201' });
            }

            if (turnoVal.length !== 0) {
                return res.status(200).json({ result: turnoVal, code: '201' });
            } else {
                return res.status(200).json({ result: "Sin Turnos ", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { nombres, cedula, fecha, id_turno, abono } = req.body;
            const datos = await CitaModel.findByPk(id);

            if (datos !== null) {
                let abonoValue = (abono === "DOADBA");
                let estado = 0;

                const datosP = await buscarPacientePorCedula(cedula);
                if (datosP !== null) {
                    estado = 1;
                }

                await CitaModel.update({
                    nombres,
                    cedula,
                    fecha,
                    id_turno,
                    abono: abonoValue,
                    estado
                }, { where: { id_cita: id } });

                return res.status(200).json({ result: "Datos actualizados", code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async destroy(req, res) {
        try {
            const { id } = req.params;
            const datos = await CitaModel.findOne({ where: { id_cita: id } });
            if (datos !== null) {
                await CitaModel.destroy({ where: { id_cita: id } });
                return res.status(200).json({ result: "Dato Eliminado", code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async ValidarCita(req, res) {
        try {
            const { cedula, fechaActual } = req.params;
            const datos = await CitaModel.findAll({ where: { cedula, fecha: fechaActual } });
            if (datos.length !== 0) {
                return res.status(200).json({ code: '201' });
            } else {
                return res.status(200).json({ result: "Proceda con el registro", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async ActualizarEstado(req, res) {
        try {
            const { cedula } = req.params;
            const datos = await CitaModel.findAll({ where: { cedula } });
            if (datos.length > 0) {
                for (const item of datos) {
                    await CitaModel.update({ estado: 1 }, { where: { id_cita: item.id_cita } });
                }
                return res.status(200).json({ result: "Cita Actualizada", code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async buscedu(req, res) {
        try {
            const { ced } = req.params;
            const datosced = await buscarPacientePorCedula(ced);
            if (datosced !== null) {
                return res.status(200).json({ result: datosced, code: '201' });
            } else {
                return res.status(200).json({ result: "Registro no encontrado", code: '202' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
