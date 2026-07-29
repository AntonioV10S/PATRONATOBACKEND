import { RolModel } from "../Models/index.js";

// Debe usarse SIEMPRE después de verificarToken (depende de req.user).
// Restringe el endpoint EXACTAMENTE a los roles que se pasan (ya no se
// agrega "Administrador" automáticamente). Por diseño, el Administrador
// queda limitado a configuración del sistema y auditoría de solo lectura
// (LOPDP) — no tiene acceso operativo a pacientes, historias clínicas,
// farmacia, citas ni movimientos financieros, salvo que se lo incluya
// explícitamente en la lista de ese endpoint puntual.
//
// Uso: ApiRouter.post('/mg/historias', verificarToken, verificarRol(['Medicina General']), ...)
export function verificarRol(rolesPermitidos) {
  return async (req, res, next) => {
    try {
      const rol = await RolModel.findByPk(req.user?.id_rol);
      if (!rol || !rolesPermitidos.includes(rol.rol)) {
        return res.status(403).json({
          code: "403",
          message: `Acceso denegado. Esta acción requiere uno de estos roles: ${rolesPermitidos.join(", ")}.`,
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({
        message: "Error al verificar permisos",
        error: error.message,
      });
    }
  };
}
