import { formatText } from "./format.js";

export function normalizeBirthDateParts(dateParts) {
  const year = String(dateParts[0] || "").replace(/\D/g, "").slice(0, 4);
  const month = String(dateParts[1] || "").replace(/\D/g, "").slice(0, 2);
  const day = String(dateParts[2] || "").replace(/\D/g, "").slice(0, 2);

  if (!year) {
    return "";
  }

  const yearNumber = Number(year);

  if (year.length < 4 || yearNumber < 1900) {
    return "";
  }

  const monthNumber = clampDatePart(Number(month || "1"), 1, 12);
  const dayNumber = clampDatePart(Number(day || "1"), 1, 31);
  return `${yearNumber}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
}

export function getAgeOutputText(birthDate) {
  const dateParts = String(birthDate || "").split("-");
  const year = Number(dateParts[0]);

  if (!birthDate || !year || year < 1900) {
    return "0년 0개월";
  }

  const month = Number(dateParts[1] || "1");
  const day = Number(dateParts[2] || "1");
  const birth = new Date(year, month - 1, day);

  if (Number.isNaN(birth.getTime())) {
    return "0년 0개월";
  }

  const today = new Date();
  let monthDiff = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();

  if (today.getDate() < birth.getDate()) {
    monthDiff -= 1;
  }

  if (monthDiff < 0) {
    return "0년 0개월";
  }

  const ageYears = Math.floor(monthDiff / 12);
  const ageMonths = monthDiff % 12;
  return `${ageYears}년 ${ageMonths}개월`;
}

export function formatMemberBirthDate(birthDate) {
  if (!birthDate) {
    return "-";
  }

  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    return formatText(birthDate);
  }

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${getAgeOutputText(birthDate)})`;
}

export function formatMemberWeight(weight) {
  if (weight === "" || weight === null || weight === undefined) {
    return "-";
  }
  return `${weight}kg`;
}

export function formatMemberGender(gender, neuteredStatus) {
  const genderText = String(gender || "").trim();
  const neuteredText = String(neuteredStatus || "").trim();

  if (!genderText && !neuteredText) {
    return "-";
  }

  return `${genderText || "-"} (${neuteredText || "-"})`;
}

function clampDatePart(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (value < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
