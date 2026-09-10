from django.test import SimpleTestCase

from fleet.services import choose_reading


class ChooseReadingTests(SimpleTestCase):
    """Voting rules for the odometer OCR fallback.

    Deliberately free of Tesseract and of any system font, so it behaves the
    same on a developer's machine and in the container.
    """

    def test_no_candidates_reads_nothing(self):
        result = choose_reading([])
        self.assertIsNone(result.reading)
        self.assertFalse(result.confident)

    def test_blank_candidates_read_nothing(self):
        self.assertIsNone(choose_reading(["", "", ""]).reading)

    def test_agreement_between_modes_is_confident(self):
        result = choose_reading(["134700", "134700", ""])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_single_mode_reading_is_not_confident(self):
        # One mode finding digits nobody else saw is exactly the case that used
        # to be presented to the operator as a clean read.
        result = choose_reading(["134700", "", ""])
        self.assertEqual(result.reading, "134700")
        self.assertFalse(result.confident)

    def test_majority_wins_over_a_disagreeing_mode(self):
        result = choose_reading(["134700", "134700", "13470"])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_implausible_lengths_are_ignored_when_a_plausible_one_exists(self):
        # "7" and "13470012345" are a partial read and a swept-in trip meter.
        result = choose_reading(["7", "134700", "13470012345", "134700"])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_only_implausible_readings_are_returned_but_flagged(self):
        # Still worth showing the operator — they can correct it — but never
        # presented as a confident read.
        result = choose_reading(["12", "12", "12"])
        self.assertEqual(result.reading, "12")
        self.assertFalse(result.confident)

    def test_boundary_lengths_count_as_plausible(self):
        self.assertTrue(choose_reading(["1234", "1234"]).confident)
        self.assertTrue(choose_reading(["1234567", "1234567"]).confident)
        self.assertFalse(choose_reading(["123", "123"]).confident)
        self.assertFalse(choose_reading(["12345678", "12345678"]).confident)
