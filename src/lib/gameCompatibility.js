// Bounded compatibility question snapshot for the post-wedding report.
export function compatibilityQuestionText(question, lang = 'EN') {
  if (Array.isArray(question?.prompts) && question.prompts.length > 0) {
    const match =
      question.prompts.find((prompt) => prompt?.language === lang) ??
      question.prompts[0];
    return typeof match?.text === 'string' ? match.text.slice(0, 500) : '';
  }
  const prompt = question?.question;
  if (typeof prompt === 'string') return prompt.slice(0, 500);
  const localized = prompt?.[lang] ?? prompt?.EN ?? null;
  return typeof localized === 'string' ? localized.slice(0, 500) : '';
}
