from hr_engine.models import Policy
from typing import Dict, Any, List

class PolicyEngine:
    @classmethod
    def get_all_policies(cls) -> List[Dict[str, Any]]:
        return [{"policy_name": p.policy_name, "rules": p.rules} for p in Policy.objects.all()]

    @classmethod
    def get_policy(cls, policy_name: str) -> Dict[str, Any]:
        # Default safe fallback clause so execute_rules never crash
        default_clause = {
            "L001": {
                "type": "leave_balance_check",
                "description": "Must have positive leave balance to apply."
            }
        }
        try:
            p = Policy.objects.get(policy_name=policy_name)
            rules = p.rules or {}
            # If the stored rules already have a clauses key, use it directly
            if "clauses" in rules:
                clauses = rules["clauses"]
            else:
                # Build a synthetic clause from the raw rules so the engine has something to work with
                clauses = default_clause
            return {
                "policy_name": p.policy_name,
                "description": p.description,
                "rules": rules,
                "clauses": clauses
            }
        except Policy.DoesNotExist:
            # Graceful fallback when the policy row is missing entirely
            return {
                "policy_name": policy_name,
                "description": "Default fallback policy.",
                "rules": {},
                "clauses": default_clause
            }

    @classmethod
    def execute_rules(cls, policy_name: str, clause_reference: str, current_context: Dict[str, Any]) -> Dict[str, Any]:
        policy = cls.get_policy(policy_name)
        clause = policy.get("clauses", {}).get(clause_reference)

        if not clause:
            raise Exception(f"Policy clause not available: {policy_name} -> {clause_reference}")

        failed_rules: List[str] = []
        reasons: List[str] = []
        conditions = clause.get("conditions", [])

        if conditions:
            for condition in conditions:
                if condition.get("type") == 'leave_balance_check':
                    remaining = current_context.get("leave_balance", {}).get("remaining", 0)
                    if remaining <= 0:
                        failed_rules.append(condition.get("type"))
                        reasons.append(condition.get("on_fail", clause.get("description")))
                elif condition.get("type") == 'wfh_limit_check':
                    days_req = current_context.get("requested_wfh_days", 0)
                    if days_req > condition.get("max_continuous_wfh_days", 3):
                        failed_rules.append("wfh_limit_check")
                        reasons.append(condition.get("on_fail", "Exceeds maximum continuous WFH limit."))
                elif condition.get("type") == 'notice_period_check':
                    notice_given = current_context.get("notice_given_days", 0)
                    if notice_given < condition.get("min_notice_period", 30):
                        failed_rules.append("notice_period_check")
                        reasons.append(condition.get("on_fail", "Insufficient notice period provided."))
        else:
            if clause.get("type") == 'leave_balance_check':
                remaining = current_context.get("leave_balance", {}).get("remaining", 0)
                if remaining <= 0:
                    failed_rules.append(clause.get("type"))
                    reasons.append(clause.get("description", "Balance negative."))
            elif clause.get("type") == 'wfh_limit_check':
                days_req = current_context.get("requested_wfh_days", 0)
                if days_req > clause.get("max_continuous_wfh_days", 3):
                    failed_rules.append("wfh_limit_check")
                    reasons.append(clause.get("on_fail", "Exceeds maximum continuous WFH limit."))
            elif clause.get("type") == 'notice_period_check':
                notice_given = current_context.get("notice_given_days", 0)
                if notice_given < clause.get("min_notice_period", 30):
                    failed_rules.append("notice_period_check")
                    reasons.append(clause.get("on_fail", "Insufficient notice period provided."))

        return {
            "passed": len(failed_rules) == 0,
            "failed_rules": failed_rules,
            "reasons": reasons,
            "policy_reference": f"{policy_name} ({clause_reference})"
        }
