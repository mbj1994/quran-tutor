export const badgeOptions = [
  'New Learner',
  "Qur'an Starter",
  'Consistent Learner',
  'Rising Reciter',
  'Tajweed Explorer',
  "Qur'an Champion",
] as const;

export function deriveBadgeFromLessons(lessonsCompleted: number) {
  if (lessonsCompleted >= 40) return "Qur'an Champion";
  if (lessonsCompleted >= 20) return 'Tajweed Explorer';
  if (lessonsCompleted >= 10) return 'Rising Reciter';
  if (lessonsCompleted >= 5) return 'Consistent Learner';
  if (lessonsCompleted >= 1) return "Qur'an Starter";
  return 'New Learner';
}

export function displayBadge(
  currentBadge: string | null | undefined,
  lessonsCompleted: number
) {
  return currentBadge || deriveBadgeFromLessons(lessonsCompleted);
}

export function getNextMilestone(lessonsCompleted: number) {
  if (lessonsCompleted === 0) return 'Join your first live Qur\'an class.';
  if (lessonsCompleted < 5) {
    return 'Complete 5 lessons to become a Consistent Learner.';
  }
  if (lessonsCompleted < 10) {
    return 'Complete 10 lessons to become a Rising Reciter.';
  }
  if (lessonsCompleted < 20) {
    return 'Complete 20 lessons to become a Tajweed Explorer.';
  }
  if (lessonsCompleted < 40) {
    return 'Complete 40 lessons to become a Qur\'an Champion.';
  }
  return 'Keep revising and strengthening your recitation.';
}

export function getMilestoneProgress(lessonsCompleted: number) {
  if (lessonsCompleted >= 40) {
    return { percent: 100, target: 40, remaining: 0 };
  }

  const target =
    lessonsCompleted === 0
      ? 1
      : lessonsCompleted < 5
        ? 5
        : lessonsCompleted < 10
          ? 10
          : lessonsCompleted < 20
            ? 20
            : 40;
  const percent = Math.min(100, Math.round((lessonsCompleted / target) * 100));

  return {
    percent,
    target,
    remaining: Math.max(0, target - lessonsCompleted),
  };
}
