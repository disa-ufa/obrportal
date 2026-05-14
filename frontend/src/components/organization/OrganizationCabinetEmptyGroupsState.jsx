import { EmptyState } from "./OrganizationCabinetForms";

export function OrganizationCabinetEmptyGroupsState() {
  return (
    <EmptyState
      title="Учебные группы пока не созданы"
      text="После добавления групп они появятся в этом кабинете. Представитель ЮЛ будет видеть только группы организаций, к которым привязана его роль."
    />
  );
}
