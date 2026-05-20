import pytest
from services.spaced_repetition import SpacedRepetitionEngine


def test_sm2_perfect_recall():
    sre = SpacedRepetitionEngine()
    easiness, interval, reps = sre.calculate(quality=5, easiness=2.5, interval=1, repetitions=0)
    # quality=5: easiness = 2.5 + 0.1 - 0 * (0.08 + 0 * 0.02) = 2.6
    assert easiness == 2.6
    assert interval == 1  # First correct: interval stays 1
    assert reps == 1


def test_sm2_second_correct():
    sre = SpacedRepetitionEngine()
    # Second correct: reps=1, interval should be 3
    easiness, interval, reps = sre.calculate(quality=4, easiness=2.6, interval=1, repetitions=1)
    assert interval == 3
    assert reps == 2


def test_sm2_third_correct():
    sre = SpacedRepetitionEngine()
    # Third correct: interval = interval * easiness = 3 * 2.5 ≈ 8
    easiness, interval, reps = sre.calculate(quality=5, easiness=2.5, interval=3, repetitions=2)
    assert interval == 8  # round(3 * 2.6) = 8
    assert reps == 3


def test_sm2_failed_recall():
    sre = SpacedRepetitionEngine()
    easiness, interval, reps = sre.calculate(quality=1, easiness=2.5, interval=8, repetitions=3)
    assert interval == 1  # Reset
    assert reps == 0


def test_sm2_easiness_floor():
    sre = SpacedRepetitionEngine()
    # Repeated failures should keep easiness at 1.3 floor
    e, i, r = sre.calculate(quality=0, easiness=1.3, interval=1, repetitions=0)
    # 1.3 + 0.1 - 5*(0.08 + 5*0.02) = 1.4 - 5*0.18 = 1.4 - 0.9 = 0.5 → clamped to 1.3
    assert e == 1.3


def test_sm2_mastery_correction_low():
    sre = SpacedRepetitionEngine()
    # quality=4, reps=3: easiness = 2.5 + 0.1 - 1*(0.08+1*0.02) = 2.5
    # interval = round(10 * 2.5) = 25
    # mastery=0.2: interval = max(1, int(25 * 0.5)) = max(1, 12) = 12
    _, interval, _ = sre.calculate(quality=4, easiness=2.5, interval=10, repetitions=3, mastery=0.2)
    assert interval == 12


def test_sm2_mastery_correction_high():
    sre = SpacedRepetitionEngine()
    _, interval, _ = sre.calculate(quality=5, easiness=2.5, interval=10, repetitions=3, mastery=0.9)
    assert interval > 10  # Extended by 1.2x


def test_sm2_update_mastery_increase():
    sre = SpacedRepetitionEngine()
    new_m = sre.update_mastery(0.5, quality=5)
    assert new_m > 0.5


def test_sm2_update_mastery_decrease():
    sre = SpacedRepetitionEngine()
    new_m = sre.update_mastery(0.5, quality=1)
    assert new_m < 0.5
