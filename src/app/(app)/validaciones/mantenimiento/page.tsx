import { ValidationInbox } from "@/components/validation-inbox";

export default function MantenimientoPage() {
  return <ValidationInbox roles={["MANTENIMIENTO"]} title="Validación Mantenimiento" type="MANTENIMIENTO" />;
}
