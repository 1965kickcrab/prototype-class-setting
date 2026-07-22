import { loadSchoolClassList } from "../storage/class-storage.js";
import { getSchoolHomeReservations } from "../storage/school-home-storage.js";

export function getAutoSelectedSchoolReservationClassId(memberPet) {
  const schoolClasses = loadSchoolClassList();
  const schoolClassById = new Map(schoolClasses.map((schoolClass) => [schoolClass.id, schoolClass]));
  const memberClassIds = Array.isArray(memberPet?.schoolClassIds) ? memberPet.schoolClassIds : [];
  const memberClasses = memberClassIds
    .map((classId) => schoolClassById.get(classId))
    .filter(Boolean)
    .sort((firstClass, secondClass) => firstClass.name.localeCompare(secondClass.name, "ko"));

  if (memberClasses.length) {
    return memberClasses[0].id;
  }

  const memberId = String(memberPet?.memberId || memberPet?.id || "").trim();
  const petId = String(memberPet?.petId || "").trim();
  return getSchoolHomeReservations()
    .filter((reservation) => {
      return reservation.status !== "취소"
        && reservation.memberId === memberId
        && reservation.petId === petId
        && schoolClassById.has(reservation.classId);
    })
    .sort((firstReservation, secondReservation) => secondReservation.date.localeCompare(firstReservation.date))[0]?.classId || "";
}
