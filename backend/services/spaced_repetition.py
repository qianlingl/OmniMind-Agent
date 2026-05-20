from datetime import datetime, timedelta, timezone


class SpacedRepetitionEngine:
    MAX_INTERVAL = 365  # days

    @staticmethod
    def calculate(quality: int, easiness: float, interval: int, repetitions: int, mastery: float = 0.5):
        if not (0 <= quality <= 5):
            raise ValueError(f"quality must be between 0 and 5, got {quality}")

        easiness = max(1.3, easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

        if quality < 3:
            return easiness, 1, 0

        reps = repetitions + 1
        if reps == 1:
            interval = 1
        elif reps == 2:
            interval = 3
        else:
            interval = round(interval * easiness)

        if mastery < 0.3:
            interval = max(1, int(interval * 0.5))
        elif mastery > 0.8:
            interval = int(interval * 1.2)

        interval = min(interval, SpacedRepetitionEngine.MAX_INTERVAL)
        return easiness, interval, reps

    @staticmethod
    def next_review_date(interval: int) -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=interval)

    @staticmethod
    def update_mastery(old_mastery: float, quality: int) -> float:
        if quality >= 4:
            delta = min(0.15, (quality - 3) * 0.05)
            return min(1.0, old_mastery + delta)
        elif quality < 3:
            return max(0.0, old_mastery - 0.1)
        return old_mastery

    @staticmethod
    def process_review(
        quality: int,
        easiness: float,
        interval: int,
        repetitions: int,
        mastery: float = 0.5,
    ) -> tuple[float, int, int, float, datetime]:
        """
        Unified entry point: process a review and return updated SM-2 params + next date.
        Returns (new_easiness, new_interval, new_repetitions, new_mastery, next_review_at).
        """
        if not (0 <= quality <= 5):
            raise ValueError(f"quality must be between 0 and 5, got {quality}")

        new_easiness, new_interval, new_repetitions = SpacedRepetitionEngine.calculate(
            quality, easiness, interval, repetitions, mastery
        )
        new_mastery = SpacedRepetitionEngine.update_mastery(mastery, quality)
        next_review = SpacedRepetitionEngine.next_review_date(new_interval)
        return new_easiness, new_interval, new_repetitions, new_mastery, next_review
