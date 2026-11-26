export function chooseQuestionIndex(count: number, previous: number | null, random = Math.random): number {
  if (previous === null || previous < 0 || previous >= count || count === 1) {
    return Math.floor(random() * count);
  }
  const choice = Math.floor(random() * (count - 1));
  return choice >= previous ? choice + 1 : choice;
}
