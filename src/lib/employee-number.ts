export class EmployeeNumberValidationError extends Error {
  constructor(message = "El numero de empleado debe contener de 1 a 5 digitos.") {
    super(message);
    this.name = "EmployeeNumberValidationError";
  }
}

export const employeeNumberHelp = "Numero de empleado de hasta 5 digitos. Si escribes 123, se guardara como 00123.";

export function normalizeEmployeeNumber(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (!/^[0-9]{1,5}$/.test(trimmed)) throw new EmployeeNumberValidationError();
  const normalized = trimmed.padStart(5, "0");
  if (normalized === "00000") {
    throw new EmployeeNumberValidationError("El numero de empleado 00000 no es valido.");
  }
  return normalized;
}

export function normalizeStoredEmployeeNumber(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    return normalizeEmployeeNumber(trimmed);
  } catch {
    return trimmed;
  }
}
