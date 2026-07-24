import { readJsonStorage, writeJsonStorage } from "./storage-utils.js";

export const SCHOOL_CLASS_LIST_STORAGE_KEY = "schoolClassList";
export function loadSchoolClassList() {
  const storedClassList = readJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, null);

  if (!Array.isArray(storedClassList)) {
    writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, []);
    return [];
  }

  const normalizedClassList = sortSchoolClassList(
    storedClassList.map(normalizeSchoolClass).filter((schoolClass) => schoolClass.name),
  );
  writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, normalizedClassList);
  return normalizedClassList;
}

export function saveSchoolClassList(classList) {
  const normalizedClassList = Array.isArray(classList)
    ? sortSchoolClassList(
      classList.map(normalizeSchoolClass).filter((schoolClass) => schoolClass.name),
    )
    : [];
  writeJsonStorage(SCHOOL_CLASS_LIST_STORAGE_KEY, normalizedClassList);
  return normalizedClassList;
}

export function createSchoolClass(classDraft) {
  const nextClass = normalizeSchoolClass({
    ...classDraft,
    id: createSchoolClassId(),
    createdAt: new Date().toISOString(),
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

export function createSchoolClassSnapshot(schoolClass) {
  const id = String(schoolClass?.id || "").trim();
  if (!id) {
    return null;
  }

  return {
    id,
    name: normalizeText(schoolClass?.name),
    capacity: normalizeCapacity(schoolClass?.capacity),
  };
}

export function getSchoolClassCapacityTotal() {
  return loadSchoolClassList().reduce((totalCapacity, schoolClass) => {
    const capacity = Number(schoolClass.capacity);
    return Number.isFinite(capacity) && capacity > 0 ? totalCapacity + capacity : totalCapacity;
  }, 0);
}

function normalizeSchoolClass(schoolClass) {
  const id = String(schoolClass?.id || createSchoolClassId()).trim();
  const name = normalizeText(schoolClass?.name);
  return {
    id,
    name,
    createdAt: normalizeCreatedAt(schoolClass?.createdAt, id),
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

function sortSchoolClassList(classList) {
  return [...classList].sort(compareSchoolClasses);
}

function compareSchoolClasses(leftClass, rightClass) {
  const nameOrder = String(leftClass.name || "").localeCompare(String(rightClass.name || ""), "ko", {
    numeric: true,
    sensitivity: "base",
  });

  if (nameOrder !== 0) {
    return nameOrder;
  }

  const createdAtOrder = String(leftClass.createdAt || "").localeCompare(String(rightClass.createdAt || ""));
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return String(leftClass.id || "").localeCompare(String(rightClass.id || ""));
}

function normalizeCreatedAt(value, classId) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  const timestamp = String(classId || "").match(/^school-class-(\d+)-/)?.[1];
  if (timestamp) {
    const idDate = new Date(Number(timestamp));
    if (!Number.isNaN(idDate.getTime())) {
      return idDate.toISOString();
    }
  }

  return "";
}

function createSchoolClassId() {
  return `school-class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
