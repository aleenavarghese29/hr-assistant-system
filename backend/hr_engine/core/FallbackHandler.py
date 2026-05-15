class FallbackHandler:
    @staticmethod
    def generate_missing_data_response(missing_element: str, reason_required: str, action_step: str) -> dict:
        return {
            "answer": f"I am currently unable to fulfill this request because {missing_element} is unavailable.",
            "data": None,
            "explanation": f"This data is required in order to {reason_required}.",
            "policy_reference": None,
            "next_steps": action_step
        }
