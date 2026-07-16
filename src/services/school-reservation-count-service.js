export function applySchoolReservationRegistration(members, memberId, petId, reservationCount) {
  const count = normalizeCount(reservationCount);
  return updateMemberPetSchoolCounts(members, memberId, petId, (counts) => ({
    remaining: counts.remaining,
    reservable: Math.max(counts.reservable - count, 0),
    reserved: counts.reserved + count,
  }));
}

export function isActiveSchoolReservation(reservation) {
  return reservation?.status !== "취소";
}

export function applySchoolReservationCancellation(members, reservations) {
  return (reservations || []).reduce((nextMembers, reservation) => {
    if (!reservation?.isCountReserved) {
      return nextMembers;
    }

    return updateMemberPetSchoolCounts(nextMembers, reservation.memberId, reservation.petId, (counts) => ({
      remaining: reservation.isRemainingConsumed ? counts.remaining + 1 : counts.remaining,
      reservable: counts.reservable + 1,
      reserved: Math.max(counts.reserved - 1, 0),
    }));
  }, members);
}

export function settlePastSchoolReservations({ members, reservations, todayDateKey }) {
  let nextMembers = members;
  let hasChanges = false;
  const nextReservations = (reservations || []).map((reservation) => {
    if (!shouldConsumeRemainingCount(reservation, todayDateKey)) {
      return reservation;
    }

    hasChanges = true;
    nextMembers = updateMemberPetSchoolCounts(nextMembers, reservation.memberId, reservation.petId, (counts) => ({
      ...counts,
      remaining: Math.max(counts.remaining - 1, 0),
    }));
    return { ...reservation, isRemainingConsumed: true };
  });

  return { members: nextMembers, reservations: nextReservations, hasChanges };
}

function shouldConsumeRemainingCount(reservation, todayDateKey) {
  return reservation?.isCountReserved
    && !reservation.isRemainingConsumed
    && isActiveSchoolReservation(reservation)
    && String(reservation.date || "") < todayDateKey;
}

function updateMemberPetSchoolCounts(members, memberId, petId, getNextCounts) {
  return (members || []).map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    return {
      ...member,
      pets: (member.pets || []).map((pet) => {
        if (pet.id !== petId) {
          return pet;
        }

        const counts = {
          remaining: normalizeCount(pet.remainingCountByType?.school),
          reservable: normalizeCount(pet.totalReservableCountByType?.school),
          reserved: normalizeCount(pet.totalReservedCountByType?.school),
        };
        const nextCounts = getNextCounts(counts);
        return {
          ...pet,
          remainingCountByType: { ...pet.remainingCountByType, school: nextCounts.remaining },
          totalReservableCountByType: { ...pet.totalReservableCountByType, school: nextCounts.reservable },
          totalReservedCountByType: { ...pet.totalReservedCountByType, school: nextCounts.reserved },
        };
      }),
    };
  });
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(count, 0) : 0;
}
