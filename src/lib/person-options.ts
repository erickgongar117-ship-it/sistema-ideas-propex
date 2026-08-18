import type { SearchablePickerOption } from "@/components/searchable-picker";

type PersonLike = {
  id: string;
  name: string;
  email?: string | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
};

/**
 * Opciones de persona para `SearchablePicker`, con el numero de empleado dentro del texto
 * buscable.
 *
 * Por que existe: Kaizen, GENBA, Ideas y Configuracion pintaban a TODA la plantilla como
 * `<option>` de un `<select>` plano. Con 1000+ personas eso obliga a recorrer una lista
 * enorme, y el numero de empleado —el identificador que la gente si conoce de memoria— ni
 * siquiera aparecia, asi que dos personas con el mismo nombre eran indistinguibles.
 * El picker filtra por etiqueta, descripcion y `searchText`, ignorando acentos.
 */
export function personOption(person: PersonLike): SearchablePickerOption {
  const detail = [person.employeeNumber ? `Empleado ${person.employeeNumber}` : null, person.jobTitle, person.email]
    .filter(Boolean)
    .join(" · ");
  return {
    value: person.id,
    label: person.name,
    description: detail || undefined,
    // El numero suelto tambien entra al indice, para que escribir "123" encuentre "00123".
    searchText: [person.employeeNumber, person.email, person.jobTitle].filter(Boolean).join(" ")
  };
}

export function personOptions(people: PersonLike[]): SearchablePickerOption[] {
  return people.map(personOption);
}
