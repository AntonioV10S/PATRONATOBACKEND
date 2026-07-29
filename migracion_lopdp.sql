-- ============================================================
-- Migración LOPDP: consentimiento informado, incidentes de
-- seguridad, y solicitudes de derechos ARCO+.
-- Segura de re-ejecutar (usa IF NOT EXISTS en todo).
-- ============================================================

-- 1. Consentimiento informado del paciente
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS consentimiento_datos BOOLEAN DEFAULT false;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fecha_consentimiento DATE;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS consentimiento_registrado_por BIGINT;

-- Pacientes ya existentes: no se puede saber retroactivamente si dieron su
-- consentimiento, así que quedan marcados explícitamente como pendientes
-- (false) en vez de asumirlos como aceptados.

-- 2. Incidentes de seguridad (notificación de vulneraciones, LOPDP Art. 45-46)
CREATE TABLE IF NOT EXISTS incidentes_seguridad (
    id_incidente BIGSERIAL PRIMARY KEY,
    fecha_incidente DATE NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    datos_afectados TEXT,
    accion_tomada TEXT,
    notificado_autoridad BOOLEAN DEFAULT false,
    fecha_notificacion DATE,
    notificado_titulares BOOLEAN DEFAULT false,
    estado VARCHAR(50) DEFAULT 'Abierto',
    registrado_por BIGINT NOT NULL REFERENCES cuentas(id_cuenta),
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- 3. Solicitudes de derechos ARCO+ (Acceso, Rectificación, Cancelación, Oposición)
CREATE TABLE IF NOT EXISTS solicitudes_arco (
    id_solicitud BIGSERIAL PRIMARY KEY,
    id_paciente BIGINT NOT NULL REFERENCES pacientes(id_paciente),
    tipo_solicitud VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_solicitud DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    resolucion TEXT,
    fecha_resolucion DATE,
    registrado_por BIGINT NOT NULL REFERENCES cuentas(id_cuenta),
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- Verificación
SELECT 'consentimiento_datos existe' AS chequeo WHERE EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='consentimiento_datos'
);
SELECT 'incidentes_seguridad existe' AS chequeo WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='incidentes_seguridad'
);
SELECT 'solicitudes_arco existe' AS chequeo WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='solicitudes_arco'
);
