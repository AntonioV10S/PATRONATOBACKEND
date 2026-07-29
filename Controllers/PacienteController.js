import { PacienteModel } from '../Models/paciente.js';
import { AuditoriaCryptoModel } from '../Models/auditoriacrypto.js';
import { CryptoService } from '../utils/cryptoService.js';
import { Op } from 'sequelize';

// Clave simétrica dedicada a datos personales de contacto (cédula, teléfono,
// correo). Es distinta de la llave institucional ECC: aquí no hay un
// "destinatario" asimétrico natural, así que se usa AES-256-GCM con una
// clave del servidor. Debe existir en .env, sin valor por defecto.
function obtenerClavePersonal() {
  if (!process.env.DATOS_PERSONALES_SECRET_KEY) {
    throw new Error(
      'DATOS_PERSONALES_SECRET_KEY no está configurada en las variables de entorno.'
    );
  }
  return process.env.DATOS_PERSONALES_SECRET_KEY;
}

function cifrarCamposPersonales({ cedula, telefono, email }) {
  const clave = obtenerClavePersonal();
  const datos = {};
  if (cedula !== undefined && cedula !== null && cedula !== '') {
    datos.cedula_enc = CryptoService.cifrarDatos(String(cedula), clave);
    datos.cedula_hash = CryptoService.calcularIndiceCiego(cedula, clave);
  }
  if (telefono !== undefined && telefono !== null && telefono !== '') {
    datos.telefono_enc = CryptoService.cifrarDatos(String(telefono), clave);
  }
  if (email !== undefined && email !== null && email !== '') {
    datos.email_enc = CryptoService.cifrarDatos(String(email), clave);
  }
  return datos;
}

function descifrarPaciente(pacienteJSON) {
  const clave = obtenerClavePersonal();
  const resultado = { ...pacienteJSON };
  try {
    resultado.cedula = resultado.cedula_enc
      ? CryptoService.descifrarDatos(resultado.cedula_enc, clave)
      : null;
    resultado.telefono = resultado.telefono_enc
      ? CryptoService.descifrarDatos(resultado.telefono_enc, clave)
      : null;
    resultado.email = resultado.email_enc
      ? CryptoService.descifrarDatos(resultado.email_enc, clave)
      : null;
  } catch (e) {
    // Si algo fue cifrado con una clave anterior o está corrupto, no tumbamos
    // toda la respuesta: se marca explícitamente en vez de fallar en silencio.
    resultado.cedula = resultado.cedula ?? '[No se pudo descifrar]';
    resultado.telefono = resultado.telefono ?? '[No se pudo descifrar]';
    resultado.email = resultado.email ?? '[No se pudo descifrar]';
  }
  // Nunca reenviar los criptogramas crudos ni el hash al frontend.
  delete resultado.cedula_enc;
  delete resultado.telefono_enc;
  delete resultado.email_enc;
  delete resultado.cedula_hash;
  return resultado;
}

const INCLUDES_LISTADO = [
  { association: 'historias_clinicas_mg' },
  { association: 'historias_clinicas_rf' },
  { association: 'habitos' },
  { association: 'familiares' },
  { association: 'examen_organo_sistemas' },
  { association: 'examen_fisicos' },
  { association: 'examene_complementarios' },
  { association: 'antecedentes_patologicos_personales', include: [{ association: 'antecedentes_ginecos_obstretico' }] },
];

const INCLUDES_DETALLE = [
  { association: 'habitos' },
  { association: 'antecedentes_patologicos_personales', include: [{ association: 'antecedentes_ginecos_obstretico' }] },
  { association: 'familiares' },
  { association: 'examen_fisicos' },
  { association: 'examen_organo_sistemas' },
  { association: 'examene_complementarios' },
];

export const PacienteController = {
  // GET /pacientes
  listarPacientes: async (req, res) => {
    try {
      const pacientes = await PacienteModel.findAll({ include: INCLUDES_LISTADO });
      const total = pacientes.length;

      if (total !== 0) {
        const result = pacientes.map((p) => descifrarPaciente(p.toJSON()));
        return res.json({ result, code: '201', total });
      } else {
        return res.json({ mensaje: 'No hay registros', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener pacientes', error: error.message });
    }
  },

  // POST /pacientes
  crearPaciente: async (req, res) => {
    try {
      const { cedula, consentimiento_datos } = req.body;
      if (!cedula) {
        return res.status(400).json({ message: 'La cédula es requerida' });
      }
      // LOPDP: no se registra un paciente sin su consentimiento informado
      // para el tratamiento de datos personales y de salud.
      if (consentimiento_datos !== true) {
        return res.status(400).json({ message: 'Debe registrarse el consentimiento informado del paciente para el tratamiento de sus datos.' });
      }

      const clave = obtenerClavePersonal();
      const cedulaHash = CryptoService.calcularIndiceCiego(cedula, clave);

      const existe = await PacienteModel.findOne({ where: { cedula_hash: cedulaHash } });
      if (existe) return res.status(400).json({ message: 'La cédula ya está registrada' });

      const camposPersonales = cifrarCamposPersonales({
        cedula: req.body.cedula,
        telefono: req.body.telefono,
        email: req.body.email,
      });

      const nuevo = await PacienteModel.create({
        id_patologico: req.body.id_patologico,
        id_e_fisico: req.body.id_e_fisico,
        id_e_organo_sistema: req.body.id_e_organo_sistema,
        id_e_complementario: req.body.id_e_complementario,
        id_habito: req.body.id_habito,
        nombres: req.body.nombres,
        apellidos: req.body.apellidos,
        edad: req.body.edad,
        sexo: req.body.sexo,
        gad: req.body.gad,
        ocupacion: req.body.ocupacion,
        residencia: req.body.residencia,
        procedencia: req.body.procedencia,
        estado_civil: req.body.estado_civil,
        raza: req.body.raza,
        religion: req.body.religion,
        fecha_nacimiento: req.body.fecha_nacimiento,
        nivel_instruccion: req.body.nivel_instruccion,
        grupo_a_prioritaria: req.body.grupo_atencion, // Mapeo de tu front
        fecha_registro: new Date().toISOString().split('T')[0],
        consentimiento_datos: true,
        fecha_consentimiento: new Date().toISOString().split('T')[0],
        consentimiento_registrado_por: req.user?.id_cuenta || null,
        ...camposPersonales,
      });

      return res.status(201).json({ result: 'Datos guardados', code: '201', id: nuevo.id_paciente });
    } catch (error) {
      res.status(400).json({ message: 'Error al registrar', error: error.message });
    }
  },

  // GET /pacientes/:id
  obtenerPacientePorId: async (req, res) => {
    try {
      const { id } = req.params;
      const paciente = await PacienteModel.findByPk(id, { include: INCLUDES_DETALLE });

      if (paciente) {
        // LOPDP: trazabilidad de accesos a datos de salud — queda registro
        // de quién consultó el expediente completo de un paciente, no solo
        // quién lo creó. No bloquea el acceso, solo lo documenta.
        AuditoriaCryptoModel.create({
          id_cuenta: req.user?.id_cuenta || null,
          tabla_afectada: 'pacientes',
          id_registro: id,
          operacion: 'CONSULTA_EXPEDIENTE',
          resultado: true,
          detalle: `Consulta del expediente completo del paciente #${id}`
        }).catch(() => { /* el acceso no debe fallar por un problema de auditoría */ });

        return res.json({ result: descifrarPaciente(paciente.toJSON()), code: '201' });
      } else {
        return res.json({ result: 'Registro no encontrado', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error en la búsqueda por ID', error: error.message });
    }
  },

  // PUT /pacientes/:id
  actualizarPaciente: async (req, res) => {
    try {
      const { id } = req.params;
      const paciente = await PacienteModel.findByPk(id);

      if (!paciente) return res.status(404).json({ result: 'Registro no encontrado', code: '202' });

      const camposPersonales = cifrarCamposPersonales({
        cedula: req.body.cedula,
        telefono: req.body.telefono,
        email: req.body.email,
      });

      await paciente.update({
        nombres: req.body.nombres,
        apellidos: req.body.apellidos,
        edad: req.body.edad,
        sexo: req.body.sexo,
        gad: req.body.gad,
        ocupacion: req.body.ocupacion,
        residencia: req.body.residencia,
        procedencia: req.body.procedencia,
        estado_civil: req.body.estado_civil,
        raza: req.body.raza,
        religion: req.body.religion,
        fecha_nacimiento: req.body.fecha_nacimiento,
        nivel_instruccion: req.body.nivel_instruccion,
        grupo_a_prioritaria: req.body.grupo_atencion, // Mapeo de tu front (mismo que en crearPaciente)
        id_patologico: req.body.id_patologico,
        id_e_fisico: req.body.id_e_fisico,
        id_e_organo_sistema: req.body.id_e_organo_sistema,
        id_e_complementario: req.body.id_e_complementario,
        id_habito: req.body.id_habito,
        ...camposPersonales,
      });

      return res.json({ result: 'Datos actualizados', code: '201' });
    } catch (error) {
      res.status(400).json({ message: 'Error al actualizar', error: error.message });
    }
  },

  // DELETE /pacientes/:id
  eliminarPaciente: async (req, res) => {
    try {
      const { id } = req.params;
      const paciente = await PacienteModel.findByPk(id);

      if (paciente) {
        await paciente.destroy();
        return res.json({ result: 'Dato Eliminado', code: '201' });
      } else {
        return res.json({ result: 'Registro no encontrado', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
  },

  // GET /pacientes/cedula/:cedula
  buscarPorCedula: async (req, res) => {
    try {
      const { cedula } = req.params;
      const clave = obtenerClavePersonal();
      const cedulaHash = CryptoService.calcularIndiceCiego(cedula, clave);

      const paciente = await PacienteModel.findOne({ where: { cedula_hash: cedulaHash } });

      if (paciente) {
        return res.json({ result: descifrarPaciente(paciente.toJSON()), code: '201' });
      } else {
        return res.json({ result: 'Registro no encontrado', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error al buscar por cédula', error: error.message });
    }
  },

  // GET /filtroFecha/:fecha
  filtro: async (req, res) => {
    try {
      const { fecha } = req.params;
      const pacientes = await PacienteModel.findAll({
        where: { fecha_registro: fecha },
      });

      if (pacientes.length > 0) {
        const result = pacientes.map((p) => descifrarPaciente(p.toJSON()));
        return res.json({ result, code: '201' });
      } else {
        return res.json({ result: 'Registro no encontrado', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error al filtrar por fecha', error: error.message });
    }
  },

  // GET /atender/:cedula
  Atender: async (req, res) => {
    try {
      const { cedula } = req.params;
      const clave = obtenerClavePersonal();
      const cedulaHash = CryptoService.calcularIndiceCiego(cedula, clave);

      const paciente = await PacienteModel.findOne({
        where: { cedula_hash: cedulaHash },
        include: [
          ...INCLUDES_DETALLE,
          {
            association: 'historias_clinicas_rf',
            include: [
              { association: 'tratamientos' },
              { association: 'diagnostico' },
            ],
          },
        ],
      });

      if (paciente) {
        const pacienteJSON = paciente.toJSON();
        const hRF = pacienteJSON.historias_clinicas_rf || [];
        const ultimaRF = hRF.length > 0 ? hRF[hRF.length - 1] : null;

        return res.json({
          result: descifrarPaciente(pacienteJSON),
          result2: ultimaRF,
          code: '201',
        });
      } else {
        return res.json({ result: 'Registro no encontrado', code: '202' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error en el proceso de atención', error: error.message });
    }
  },
};
