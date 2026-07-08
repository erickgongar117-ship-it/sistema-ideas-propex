import { ValidationInbox } from "@/components/validation-inbox";

export default function MantenimientoPage() {
  return <ValidationInbox roles={["MANTENIMIENTO"]} title="Validacion Mantenimiento" type="MANTENIMIENTO" />;
}
