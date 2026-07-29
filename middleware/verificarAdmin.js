import { RolModel } from "../Models/index.js";

// Debe usarse SIEMPRE después de verificarToken (depende de req.user).
// Restringe el endpoint a cuentas cuyo rol se llama exactamente "Administrador".
// Se busca el rol en la BD en cada petición (no se confía en un id_rol fijo,
// que podría variar entre despliegues según el orden en que se sembraron los roles).
export async function verificarAdmin(req, res, next) {
  try {
    const rol = await RolModel.findByPk(req.user?.id_rol);
    if (!rol || rol.rol !== "Administrador") {
      return res.status(403).json({
        code: "403",
        message: "Acceso denegado. Esta acción requiere rol de Administrador.",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Error al verificar permisos",
      error: error.message,
    });
  }
}
