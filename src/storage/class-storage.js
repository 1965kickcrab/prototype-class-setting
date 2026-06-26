import { readJsonStorage, writeJsonStorage } from "./storage-utils.js";

export const SCHOOL_CLASS_LIST_STORAGE_KEY = "schoolClassList";

const DEFAULT_SCHOOL_CLASS = {
  id: "school-default",
  name: "유치원",
  manager: "",
  capacity: null,
  businessDays: [],
};

export function loadSchoolClassList() {
  const storedClassList = readJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, null);

  if (!Array.isArray(storedClassList) || storedClassList.length === 0) {
    const defaultClassList = [{ ...DEFAULT_SCHOOL_CLASS }];
    writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, defaultClassList);
    return defaultClassList;
  }

  const normalizedClassList = storedClassList.map(normalizeSchoolClass).filter((schoolClass) => schoolClass.name);
  if (normalizedClassList.length === 0) {
    const defaultClassList = [{ ...DEFAULT_SCHOOL_CLASS }];
    writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, defaultClassList);
    return defaultClassList;
  }

  writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, normalizedClassList);
  return normalizedClassList;
}

export function saveSchoolClassList(classList) {
  const normalizedClassList = Array.isArray(classList)
    ? classList.map(normalizeSchoolClass).filter((schoolClass) => schoolClass.name)
    : [];
  writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, normalizedClassList);
  return normalizedClassList;
}

export function createSchoolClass(classDraft) {
  const nextClass = normalizeSchoolClass({
    ...classDraft,
    id: createSchoolClassId(),
  });
  saveSchoolClassList([...loadSchoolClassList(), nextClass]);
  return nextClass;
}

export function updateSchoolClass(classId, classDraft) {
  const targetClassId = String(classId || "").trim();
  const currentClassList = loadSchoolClassList();
  const nextClassList = currentClassList.map((schoolClass) => {
    if (schoolClass.id !== targetClassId) {
      return schoolClass;
    }

    return normalizeSchoolClass({
      ...schoolClass,
      ...classDraft,
      id: schoolClass.id,
    });
  });

  saveSchoolClassList(nextClassList);
  return nextClassList.find((schoolClass) => schoolClass.id === targetClassId) || null;
}

export function deleteSchoolClass(classId) {
  const targetClassId = String(classId || "").trim();
  const currentClassList = loadSchoolClassList();
  const nextClassList = currentClassList.filter((schoolClass) => schoolClass.id !== targetClassId);
  saveSchoolClassList(nextClassList);
  return nextClassList;
}

export function getSchoolClassCapacityTotal() {
  return loadSchoolClassList().reduce((totalCapacity, schoolClass) => {
    const capacity = Number(schoolClass.capacity);
    return Number.isFinite(capacity) && capacity > 0 ? totalCapacity + capacity : totalCapacity;
  }, 0);
}

function normalizeSchoolClass(schoolClass) {
  return {
    id: String(schoolClass?.id || createSchoolClassId()).trim(),
    name: normalizeText(schoolClass?.name),
    manager: normalizeText(schoolClass?.manager),
    capacity: normalizeCapacity(schoolClass?.capacity),
    businessDays: normalizeBusinessDays(schoolClass?.businessDays),
  };
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeCapacity(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const capacity = Number(value);
  return Number.isInteger(capacity) && capacity >= 1 && capacity <= 99 ? capacity : null;
}

function normalizeBusinessDays(businessDays) {
  if (!Array.isArray(businessDays)) {
    return [];
  }

  const weekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return weekdayKeys.filter((weekdayKey) => businessDays.includes(weekdayKey));
}

function createSchoolClassId() {
  return `school-class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
