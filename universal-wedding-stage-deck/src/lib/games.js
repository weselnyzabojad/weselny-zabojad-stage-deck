function localized(value, locale = 'PL') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    for (const key of [locale, 'PL', 'EN', 'FR']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
  }
  return null;
}

export function resolveGameQuestionLists(wedding, locale = 'PL') {
  if (wedding?.games?.enabled !== true) return [];
  const lists = Array.isArray(wedding?.games?.questionLists)
    ? wedding.games.questionLists
    : [];

  return lists
    .filter((list) => list && typeof list === 'object' && list.id && list.title)
    .map((list) => {
      const status = list.status ?? 'AVAILABLE';
      const questions = Array.isArray(list.questions)
        ? list.questions
            .filter((question) => question && question.id)
            .map((question) => ({
              id: question.id,
              prompt: localized(question.prompt, locale),
              answer: localized(question.answer, locale),
            }))
            .filter((question) => question.prompt)
        : [];
      return {
        id: list.id,
        title: list.title,
        sourceDocId: list.sourceDocId ?? null,
        status,
        unavailable: status !== 'AVAILABLE' || questions.length === 0,
        questions,
      };
    });
}

export function gamesAvailable(wedding) {
  return resolveGameQuestionLists(wedding).some(
    (list) => !list.unavailable && list.questions.length > 0,
  );
}
