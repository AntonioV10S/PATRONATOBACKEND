import { MedicoModel as CuentaModel, RolModel, LlaveEccModel, AuditoriaCryptoModel } from "../Models/index.js";
import { CryptoService } from "../utils/cryptoService.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;

// Nunca usar una contraseña por defecto en código: si falta la variable de
// entorno, la app debe fallar explícitamente en vez de operar insegura.
function obtenerJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET no está configurado en las variables de entorno.",
    );
  }
  return process.env.JWT_SECRET;
}

export const CuentaController = {
  index: async (req, res) => {
    try {
      const cuentas = await CuentaModel.findAll({
        attributes: { exclude: ["password_enc", "token_sesion"] },
      });

      if (cuentas.length !== 0) {
        const result = await Promise.all(
          cuentas.map(async (cuenta) => {
            const rol = await RolModel.findByPk(cuenta.id_rol);
            return {
              ...cuenta.toJSON(),
              role: rol ? rol.toJSON() : null,
            };
          }),
        );
        return res.json({ result });
      } else {
        return res.json({
          mensaje: "No existen datos registrados",
          code: "202",
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error en el servidor", error: error.message });
    }
  },

  store: async (req, res) => {
    try {
      const { id_rol, nombres, correo, password, imagen, estado } = req.body;

      if (!password || password.length < 8) {
        return res.json({
          mensaje: "La contraseña debe tener al menos 8 caracteres",
          code: "202",
        });
      }

      const rolAsignado = await RolModel.findByPk(id_rol);
      if (!rolAsignado) {
        return res.json({
          mensaje: "El rol especificado no existe",
          code: "202",
        });
      }

      const correoExistente = await CuentaModel.findOne({ where: { correo } });
      if (correoExistente) {
        return res.json({
          mensaje: "Ya existe una cuenta registrada con ese correo",
          code: "202",
        });
      }

      // Contraseña: hash con bcrypt (irreversible), nunca cifrado reversible.
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const datos = await CuentaModel.create({
        id_rol,
        nombres,
        correo,
        password_enc: passwordHash,
        imagen: imagen || "/imagenes/undefined.png",
        estado: estado !== undefined ? estado : true,
        token_sesion: "",
      });

      // Si el rol atiende pacientes o firma historias, generamos su par de
      // llaves ECC. La privada se entrega UNA sola vez y no se guarda en la BD.
      let llavesECC = null;
      if (rolAsignado.atiende_medico === true || rolAsignado.atencion === true) {
        llavesECC = CryptoService.generarClavesECC();
        await LlaveEccModel.create({
          creado_por: datos.id_cuenta,
          nombre: `Llave de firma - ${nombres}`,
          llave_publica_pem: llavesECC.publicKey,
          algoritmo: "prime256v1",
          activa: true,
        });
      }

      return res.json({
        result: "Datos guardados",
        code: "201",
        id: datos.id_cuenta,
        crypto: llavesECC
          ? {
              llave_publica_pem: llavesECC.publicKey,
              llave_privada_descarga: llavesECC.privateKey,
              advertencia:
                "Guarde esta llave privada de forma segura. No se puede recuperar después.",
            }
          : null,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al guardar", error: error.message });
    }
  },

  // POST /cuentas/:id/regenerar-llave
  // Caso de uso: el médico perdió su llave privada (o se comprometió) y
  // necesita firmar historias clínicas nuevas. Se desactiva la llave activa
  // anterior (queda en el historial, marcada inactiva — los registros ya
  // firmados con ella siguen siendo verificables porque cada historia
  // clínica guarda su propia copia de la llave pública usada al firmar,
  // no una referencia "viva" a la llave actual de la cuenta). Se genera un
  // par nuevo y se entrega la privada una sola vez, igual que al crear la cuenta.
  regenerarLlave: async (req, res) => {
    try {
      const { id } = req.params;

      const cuenta = await CuentaModel.findByPk(id);
      if (!cuenta) {
        return res.json({ mensaje: "La cuenta no existe", code: "202" });
      }

      const rol = await RolModel.findByPk(cuenta.id_rol);
      if (!rol || (!rol.atiende_medico && !rol.atencion)) {
        return res.json({
          mensaje: "Esta cuenta no tiene un rol que requiera llave ECC",
          code: "202",
        });
      }

      // Desactivar todas las llaves activas previas de esta cuenta (no se
      // borran: quedan como historial, marcadas inactivas).
      await LlaveEccModel.update(
        { activa: false },
        { where: { creado_por: id, activa: true } }
      );

      const llavesNuevas = CryptoService.generarClavesECC();
      await LlaveEccModel.create({
        creado_por: id,
        nombre: `Llave de firma - ${cuenta.nombres} (rotada ${new Date().toISOString().split('T')[0]})`,
        llave_publica_pem: llavesNuevas.publicKey,
        algoritmo: "prime256v1",
        activa: true,
      });

      // Registro de auditoría: queda constancia de quién y cuándo se roto la llave.
      await AuditoriaCryptoModel.create({
        id_cuenta: req.user?.id_cuenta || null,
        tabla_afectada: "llaves_ecc",
        id_registro: id,
        operacion: "ROTAR_LLAVE_ECC",
        resultado: true,
        detalle: `Rotación de llave ECC para la cuenta #${id} (${cuenta.nombres}), solicitada por la cuenta #${req.user?.id_cuenta}.`,
      });

      return res.json({
        result: "Llave regenerada correctamente",
        code: "201",
        crypto: {
          llave_publica_pem: llavesNuevas.publicKey,
          llave_privada_descarga: llavesNuevas.privateKey,
          advertencia:
            "Guarde esta llave privada de forma segura. No se puede recuperar después. Los registros firmados con la llave anterior siguen siendo válidos.",
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al regenerar la llave", error: error.message });
    }
  },

  showId: async (req, res) => {
    try {
      const { id } = req.params;
      const cuenta = await CuentaModel.findOne({
        where: { id_cuenta: id },
        attributes: { exclude: ["password_enc", "token_sesion"] },
      });

      if (cuenta !== null) {
        const rol = await RolModel.findByPk(cuenta.id_rol);
        const result = {
          ...cuenta.toJSON(),
          role: rol ? rol.toJSON() : null,
        };
        return res.json({ result });
      } else {
        return res.json({ mensaje: "Registro no encontrado", code: "202" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al buscar", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const id_cuenta = id || req.body.id_cuenta;
      const { id_rol, nombres, correo, password, imagen, estado } = req.body;

      const datos = await CuentaModel.findOne({ where: { id_cuenta } });

      if (datos !== null) {
        datos.id_rol = id_rol;
        datos.nombres = nombres;
        datos.correo = correo;
        datos.imagen = imagen || datos.imagen;
        if (estado !== undefined) datos.estado = estado;

        if (password) {
          if (password.length < 8) {
            return res.json({
              mensaje: "La contraseña debe tener al menos 8 caracteres",
              code: "202",
            });
          }
          datos.password_enc = await bcrypt.hash(password, SALT_ROUNDS);
        }

        await datos.save();
        return res.json({ mensaje: "Dato Actualizado.", code: "201" });
      } else {
        return res.json({ mensaje: "Registro no encontrado", code: "202" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al actualizar", error: error.message });
    }
  },

  // PUT /cuentas/mi-password
  // Self-service: cualquier cuenta autenticada cambia SU PROPIA contraseña.
  // Usa req.user.id_cuenta (del token), nunca un id de la URL, así que es
  // imposible que alguien cambie la contraseña de otra persona por aquí.
  // El admin nunca ve ni necesita escribir la contraseña de nadie más.
  cambiarMiPassword: async (req, res) => {
    try {
      const { passwordActual, passwordNueva } = req.body;
      const id_cuenta = req.user.id_cuenta;

      if (!passwordNueva || passwordNueva.length < 8) {
        return res.json({
          mensaje: "La nueva contraseña debe tener al menos 8 caracteres",
          code: "202",
        });
      }

      const cuenta = await CuentaModel.findByPk(id_cuenta);
      if (!cuenta) {
        return res.json({ mensaje: "Cuenta no encontrada", code: "202" });
      }

      const passwordValida = await bcrypt.compare(passwordActual || "", cuenta.password_enc);
      if (!passwordValida) {
        return res.json({ mensaje: "La contraseña actual no es correcta", code: "202" });
      }

      cuenta.password_enc = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
      await cuenta.save();

      return res.json({ result: "Contraseña actualizada correctamente", code: "201" });
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al cambiar la contraseña", error: error.message });
    }
  },

  // PUT /cuentas/:id/resetear-password  (solo Administrador)
  // Para cuando alguien perdió su contraseña por completo y no puede usar el
  // cambio self-service (que exige conocer la actual). El admin fija una
  // contraseña temporal; se le debe comunicar a la persona por un canal
  // aparte (no queda visible en ningún lado del sistema después de esto).
  resetearPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { passwordTemporal } = req.body;

      if (!passwordTemporal || passwordTemporal.length < 8) {
        return res.json({
          mensaje: "La contraseña temporal debe tener al menos 8 caracteres",
          code: "202",
        });
      }

      const cuenta = await CuentaModel.findByPk(id);
      if (!cuenta) {
        return res.json({ mensaje: "Cuenta no encontrada", code: "202" });
      }

      cuenta.password_enc = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);
      await cuenta.save();

      return res.json({ result: "Contraseña reseteada correctamente", code: "201" });
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al resetear la contraseña", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const datos = await CuentaModel.findOne({ where: { id_cuenta: id } });

      if (datos !== null) {
        await datos.destroy();
        return res.json({ result: "Registro Eliminado", code: "201" });
      } else {
        return res.json({ result: "Registro no encontrado", code: "202" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error al eliminar", error: error.message });
    }
  },

  // Consulta protegida de metadatos de una cuenta (ya no participa del login).
  validarUsuario: async (req, res) => {
    try {
      const { correo } = req.params;
      const cuenta = await CuentaModel.findOne({
        where: { correo },
        attributes: { exclude: ["password_enc", "token_sesion"] },
      });

      if (!cuenta) {
        return res.json({ mensaje: "Usuario no encontrado", code: "202" });
      }

      const rol = await RolModel.findByPk(cuenta.id_rol);
      return res.json({
        result: [{ ...cuenta.toJSON(), role: rol ? rol.toJSON() : null }],
        code: "201",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error en la validación", error: error.message });
    }
  },

  // ÚNICO punto de entrada real de autenticación.
  // Verifica la contraseña contra el hash bcrypt y solo entonces emite el JWT.
  iniciarSesion: async (req, res) => {
    try {
      const { correo, password } = req.body;

      if (!correo || !password) {
        return res.json({
          mensaje: "Correo y contraseña son requeridos",
          code: "202",
        });
      }

      const cuenta = await CuentaModel.findOne({ where: { correo } });

      if (!cuenta) {
        // Mensaje genérico: no revelar si el correo existe o no.
        return res.json({ mensaje: "Credenciales inválidas", code: "202" });
      }

      const rolAsignado = await RolModel.findByPk(cuenta.id_rol);

      if (
        cuenta.estado === false ||
        cuenta.estado == 0 ||
        (rolAsignado && (rolAsignado.estado === false || rolAsignado.estado == 0))
      ) {
        return res.json({ mensaje: "Usuario deshabilitado", code: "203" });
      }

      if (!cuenta.password_enc) {
        return res.json({ mensaje: "Credenciales inválidas", code: "202" });
      }

      const passwordValida = await bcrypt.compare(password, cuenta.password_enc);
      if (!passwordValida) {
        return res.json({ mensaje: "Credenciales inválidas", code: "202" });
      }

      const token = jwt.sign(
        {
          id_cuenta: cuenta.id_cuenta,
          correo: cuenta.correo,
          nombres: cuenta.nombres,
          id_rol: cuenta.id_rol,
        },
        obtenerJwtSecret(),
        { algorithm: "HS256", expiresIn: "8h" },
      );

      return res.json({
        code: "201",
        token,
        result: [
          {
            id_cuenta: cuenta.id_cuenta,
            nombres: cuenta.nombres,
            correo: cuenta.correo,
            role: { rol: rolAsignado ? rolAsignado.rol : "Sin Rol" },
          },
        ],
      });
    } catch (error) {
      return res.status(500).json({
        mensaje: "Error en el inicio de sesión",
        error: error.message,
      });
    }
  },

  obtenerCuentasPorRol: async (req, res) => {
    try {
      const { id_rol } = req.params;
      const datos = await CuentaModel.findAll({
        where: { id_rol, estado: true },
        attributes: { exclude: ["password_enc", "token_sesion"] },
      });

      if (datos.length > 0) {
        return res.json({ result: datos, code: "201" });
      } else {
        return res.json({ result: "No hay datos", code: "202" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ mensaje: "Error en la consulta", error: error.message });
    }
  },
};
