from hr_engine.types import RequestContext, Intent, SubIntent

class IntentResolver:
    @staticmethod
    def resolve(context: RequestContext):
        query = (context.request.query_text or "").lower()
        
        intent = Intent.UNKNOWN
        sub_intent = SubIntent.UNKNOWN

        # Base Intent
        if any(kw in query for kw in ["apply", "request", "take leave", "take casual", "take sick", "take unpaid", "want to take"]):
             intent = Intent.LEAVE_QUERY
        elif any(kw in query for kw in ["policy", "rules", "conduct", "notice period", "wfh", "work from home", "attendance", "resign", "resignation", "holiday", "holidays", "notice", "remote work", "code of conduct", "leave policy", "payroll policy"]):
             intent = Intent.POLICY_QUERY
        elif any(kw in query for kw in ["leave", "sick", "casual", "avail", "time off"]):
             intent = Intent.LEAVE_QUERY
        elif any(kw in query for kw in ["salary", "pay", "net", "bonus", "paycheck", "payslip", "tax", "deduction", "ctc", "gross", "allowance", "hra", "pf", "income", "how much", "earn", "earned"]):
             intent = Intent.PAYROLL_QUERY
        elif "document" in query:
             intent = Intent.DOCUMENT_REQUEST
        elif any(kw in query for kw in ["profile", "who am i", "blood", "contact", "emergency", "department", "probation", "job code", "role", "my details", "my info"]):
             intent = Intent.PROFILE_QUERY
        else:
             intent = Intent.UNKNOWN

        # Sub-Intent — ORDER MATTERS: more specific checks first
        if any(kw in query for kw in ["why", "explain", "how come"]):
             sub_intent = SubIntent.EXPLAIN
        elif any(kw in query for kw in ["difference", "compare", "less than", "more than"]):
             sub_intent = SubIntent.COMPARE
        elif "apply" in query or "request" in query or "need to take" in query or "feeling sick" in query or "not feeling" in query:
             sub_intent = SubIntent.APPLY
        elif "eligible" in query or "eligibility" in query:
             sub_intent = SubIntent.ELIGIBILITY
        elif any(kw in query for kw in ["how many", "what is", "show", "balance", "remaining", "avail", "left", "history", "list", "applied"]):
             sub_intent = SubIntent.VIEW
        elif any(kw in query for kw in ["simulate", "hypothetical", "without balance", "if i take", "can i take", "can i apply"]):
             sub_intent = SubIntent.SIMULATION
        else:
             sub_intent = SubIntent.VIEW

        context.intent = intent
        context.sub_intent = sub_intent

        return intent, sub_intent
