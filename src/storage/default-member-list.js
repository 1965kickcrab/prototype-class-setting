const DEFAULT_MEMBER_LIST = [
  createDefaultMember({
    id: "member-kim-minji",
    guardianName: "김민지",
    phoneNumber: "010-2345-1001",
    address: "서울시 마포구",
    pets: [
      createDefaultPet({
        id: "pet-byeoli",
        petName: "별이",
        breed: "캐벌리어 킹 찰스 스패니얼",
        birthDate: "2021-03-12",
        animalRegistrationNumber: "410000000001001",
        coatColor: "브라운 화이트",
        weight: "6.2",
        gender: "여아",
        neuteredStatus: "완료",
      }),
      createDefaultPet({
        id: "pet-bori",
        petName: "보리",
        breed: "비숑 프리제",
        birthDate: "2022-08-19",
        animalRegistrationNumber: "410000000001004",
        coatColor: "화이트",
        weight: "5.1",
        gender: "남아",
        neuteredStatus: "완료",
      }),
    ],
  }),
  createDefaultMember({
    id: "member-lee-seojun",
    guardianName: "이서준",
    phoneNumber: "010-2345-1002",
    address: "서울시 용산구",
    pets: [
      createDefaultPet({
        id: "pet-coco",
        petName: "코코",
        breed: "토이 푸들",
        birthDate: "2020-11-02",
        animalRegistrationNumber: "410000000001002",
        coatColor: "크림",
        weight: "4.1",
        gender: "남아",
        neuteredStatus: "완료",
      }),
    ],
  }),
  createDefaultMember({
    id: "member-park-hana",
    guardianName: "박하나",
    phoneNumber: "010-2345-1003",
    address: "서울시 성동구",
    pets: [
      createDefaultPet({
        id: "pet-cherry",
        petName: "체리",
        breed: "말티즈",
        birthDate: "2022-05-20",
        animalRegistrationNumber: "410000000001003",
        coatColor: "화이트",
        weight: "3.8",
        gender: "여아",
        neuteredStatus: "미완료",
      }),
    ],
  }),
];

export function getDefaultMemberList() {
  return DEFAULT_MEMBER_LIST.map(cloneMember);
}

function createDefaultMember({ id, guardianName, phoneNumber, address, pets }) {
  return {
    id,
    guardianName,
    phoneNumber,
    address,
    addressDetail: "",
    isRegistered: true,
    ownerTags: [],
    pets,
  };
}

function createDefaultPet({
  id,
  petName,
  breed,
  birthDate,
  animalRegistrationNumber,
  coatColor,
  weight,
  gender,
  neuteredStatus,
}) {
  const totalCount = 8;
  const reservedCount = 1;

  return {
    id,
    petName,
    dogName: petName,
    breed,
    memo: "",
    birthDate,
    animalRegistrationNumber,
    coatColor,
    weight,
    gender,
    neuteredStatus,
    remainingCountByType: { school: totalCount - reservedCount, daycare: 0, oneway: 0, roundtrip: 0 },
    totalReservableCountByType: { school: totalCount, daycare: 0, oneway: 0, roundtrip: 0 },
    totalReservedCountByType: { school: reservedCount, daycare: 0, oneway: 0, roundtrip: 0 },
    ticketHistories: [{
      id: `ticket-${id}`,
      status: "이용중",
      ticketName: "유치원 정기권",
      remainingCount: totalCount - reservedCount,
      totalCount,
      validDays: 30,
      expiresAt: "2025-07-31",
      amount: 280000,
    }],
    petTags: [],
    schoolClassIds: [],
  };
}

function cloneMember(member) {
  return {
    ...member,
    ownerTags: [...member.ownerTags],
    pets: member.pets.map((pet) => ({
      ...pet,
      remainingCountByType: { ...pet.remainingCountByType },
      totalReservableCountByType: { ...pet.totalReservableCountByType },
      totalReservedCountByType: { ...pet.totalReservedCountByType },
      ticketHistories: pet.ticketHistories.map((ticket) => ({ ...ticket })),
      petTags: [...pet.petTags],
      schoolClassIds: [...pet.schoolClassIds],
    })),
  };
}
