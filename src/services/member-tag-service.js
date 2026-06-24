export function normalizeMemberTagName(memberTagName) {
  return String(memberTagName || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function sanitizeTagList(memberTags) {
  if (!Array.isArray(memberTags)) {
    return [];
  }

  const seenTagNames = new Set();
  const sanitizedTags = [];

  memberTags.forEach((memberTagName) => {
    const trimmedTagName = String(memberTagName || "").trim().replace(/\s+/g, " ");
    const normalizedTagName = normalizeMemberTagName(trimmedTagName);

    if (!trimmedTagName || seenTagNames.has(normalizedTagName)) {
      return;
    }

    seenTagNames.add(normalizedTagName);
    sanitizedTags.push(trimmedTagName);
  });

  return sanitizedTags;
}

export function sortMemberTagNames(memberTags) {
  return sanitizeTagList(memberTags).sort(compareMemberTagNames);
}

export function hasDuplicateMemberTagDraftName(drafts) {
  const activeDrafts = Array.isArray(drafts) ? drafts : [];
  const seenTagNames = new Set();

  return activeDrafts.some((draft) => {
    if (draft?.isDeleted) {
      return false;
    }

    const normalizedTagName = normalizeMemberTagName(draft?.nextTag || draft?.sourceTag);
    if (!normalizedTagName) {
      return false;
    }

    if (seenTagNames.has(normalizedTagName)) {
      return true;
    }

    seenTagNames.add(normalizedTagName);
    return false;
  });
}

export function mergeTagCatalog(currentTags, incomingTags) {
  return sortMemberTagNames([...(currentTags || []), ...(incomingTags || [])]);
}

function compareMemberTagNames(leftTagName, rightTagName) {
  return String(leftTagName || "").localeCompare(String(rightTagName || ""), "ko-KR", {
    numeric: true,
    sensitivity: "base",
  });
}

export function buildTagSuggestions(catalog, query, selectedTags, limit = 6) {
  const normalizedQuery = normalizeMemberTagName(query);
  const selectedTagSet = new Set(sanitizeTagList(selectedTags).map(normalizeMemberTagName));
  const candidateTags = sanitizeTagList(catalog).filter((memberTagName) => {
    const normalizedTagName = normalizeMemberTagName(memberTagName);
    return !selectedTagSet.has(normalizedTagName);
  });

  if (!normalizedQuery) {
    return candidateTags.slice(0, limit);
  }

  const rankedMatches = candidateTags
    .map((memberTagName, index) => {
      return {
        memberTagName,
        index,
        score: getTagSearchScore(normalizeMemberTagName(memberTagName), normalizedQuery),
      };
    })
    .filter(({ score }) => score < Number.POSITIVE_INFINITY)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return left.index - right.index;
    });

  return rankedMatches.slice(0, limit).map(({ memberTagName }) => memberTagName);
}

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_JUNGSEONG_COUNT = 21;
const HANGUL_JONGSEONG_COUNT = 28;
const COMPATIBILITY_CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

function getTagSearchScore(candidate, query) {
  if (candidate.startsWith(query)) {
    return 0;
  }

  if (matchesKoreanTagPrefix(candidate, query)) {
    return 1;
  }

  if (candidate.includes(query)) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
}

function matchesKoreanTagPrefix(candidate, query) {
  if (!candidate || !query || candidate.length < query.length) {
    return false;
  }

  for (let index = 0; index < query.length; index += 1) {
    const queryCharacter = query[index];
    const candidateCharacter = candidate[index];
    const isLastCharacter = index === query.length - 1;

    if (isLastCharacter) {
      return matchesSearchCharacter(queryCharacter, candidateCharacter);
    }

    if (queryCharacter !== candidateCharacter) {
      return false;
    }
  }

  return false;
}

function matchesSearchCharacter(queryCharacter, candidateCharacter) {
  if (!queryCharacter || !candidateCharacter) {
    return false;
  }

  if (queryCharacter === candidateCharacter) {
    return true;
  }

  if (isCompatibilityChoseong(queryCharacter)) {
    return getCharacterChoseong(candidateCharacter) === queryCharacter;
  }

  const querySyllable = getHangulSyllableParts(queryCharacter);
  const candidateSyllable = getHangulSyllableParts(candidateCharacter);

  if (!querySyllable || !candidateSyllable) {
    return false;
  }

  if (querySyllable.jongseongIndex !== 0) {
    return false;
  }

  return querySyllable.choseongIndex === candidateSyllable.choseongIndex
    && querySyllable.jungseongIndex === candidateSyllable.jungseongIndex;
}

function isCompatibilityChoseong(character) {
  return COMPATIBILITY_CHOSEONG.includes(character);
}

function getCharacterChoseong(character) {
  if (isCompatibilityChoseong(character)) {
    return character;
  }

  const syllableParts = getHangulSyllableParts(character);
  if (!syllableParts) {
    return "";
  }

  return COMPATIBILITY_CHOSEONG[syllableParts.choseongIndex] || "";
}

function getHangulSyllableParts(character) {
  const codePoint = String(character || "").charCodeAt(0);
  if (!Number.isFinite(codePoint) || codePoint < HANGUL_SYLLABLE_START || codePoint > HANGUL_SYLLABLE_END) {
    return null;
  }

  const syllableOffset = codePoint - HANGUL_SYLLABLE_START;
  const choseongIndex = Math.floor(syllableOffset / (HANGUL_JUNGSEONG_COUNT * HANGUL_JONGSEONG_COUNT));
  const jungseongIndex = Math.floor((syllableOffset % (HANGUL_JUNGSEONG_COUNT * HANGUL_JONGSEONG_COUNT)) / HANGUL_JONGSEONG_COUNT);
  const jongseongIndex = syllableOffset % HANGUL_JONGSEONG_COUNT;

  return {
    choseongIndex,
    jungseongIndex,
    jongseongIndex,
  };
}

export function syncTagListWithCatalogEdits(memberTags, drafts) {
  const activeDrafts = Array.isArray(drafts) ? drafts : [];
  const editedTags = sanitizeTagList(memberTags).map((memberTagName) => {
    const matchingDraft = activeDrafts.find((draft) => {
      return normalizeMemberTagName(draft?.sourceTag) === normalizeMemberTagName(memberTagName);
    });

    if (!matchingDraft || matchingDraft.isDeleted) {
      return matchingDraft?.isDeleted ? "" : memberTagName;
    }

    return matchingDraft.nextTag || memberTagName;
  });

  return sanitizeTagList(editedTags);
}

export function applyCatalogDrafts(catalog, drafts) {
  const activeDrafts = Array.isArray(drafts) ? drafts : [];
  const editedTags = sanitizeTagList(catalog).map((memberTagName) => {
    const matchingDraft = activeDrafts.find((draft) => {
      return normalizeMemberTagName(draft?.sourceTag) === normalizeMemberTagName(memberTagName);
    });

    if (!matchingDraft || matchingDraft.isDeleted) {
      return matchingDraft?.isDeleted ? "" : memberTagName;
    }

    return matchingDraft.nextTag || memberTagName;
  });

  const currentTagSet = new Set(sanitizeTagList(catalog).map(normalizeMemberTagName));
  const newTags = activeDrafts
    .filter((draft) => {
      const sourceTag = normalizeMemberTagName(draft?.sourceTag);
      return !draft?.isDeleted && sourceTag && !currentTagSet.has(sourceTag);
    })
    .map((draft) => draft.nextTag || draft.sourceTag);

  return sortMemberTagNames([...editedTags, ...newTags]);
}
