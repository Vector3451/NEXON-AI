class BaseGrader:
    def grade(self, episode_state, scenario: dict) -> float:
        """
        Returns 0.0 to 1.0
        Must be deterministic — same inputs always same output
        """
        raise NotImplementedError("Subclasses must implement the grade method")
