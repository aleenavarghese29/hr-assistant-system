import time
from hr_engine.types import UserRequest, RequestContext, Intent, SubIntent, BaseResponse
from hr_engine.core.IntentResolver import IntentResolver
from hr_engine.core.ContextManager import ContextManager
from hr_engine.core.ResponseBuilder import ResponseBuilder
from hr_engine.core.FallbackHandler import FallbackHandler
from hr_engine.modules.SecurityLayer import SecurityLayer
from hr_engine.modules.DataAccessLayer import DataAccessLayer
from hr_engine.modules.PolicyEngine import PolicyEngine
from hr_engine.modules.ComputationEngine import ComputationEngine
from hr_engine.modules.AuditLogger import AuditLogger

class Orchestrator:
    @classmethod
    def process_request(cls, request: UserRequest) -> BaseResponse:
        session_id = request.session_id or request.employee_id
        context = RequestContext(request=request, session_id=session_id)
        
        q = (request.query_text or "").lower()
        
        # INTENT SAFETY FILTER
        malicious_kws = ["hack", "bypass", "ignore policy", "override system", "ignore all rules", "ignore rules", "override"]
        if any(kw in q for kw in malicious_kws):
            return BaseResponse(
                answer="I cannot assist with that request.",
                data=None,
                explanation="This request violates system security and policy constraints.",
                policy_reference="SYSTEM_SECURITY_POLICY",
                next_steps=None
            ).__dict__
            
        forbidden_kws = ["other employee", "employee x", "others", "colleague", "average salary", "aggregated", "who earns", "all employees", "anyone", "everyone", "other people", "someone else", "another"]
        if any(kw in q for kw in forbidden_kws) and not ("my" in q and "compare" not in q):
            return BaseResponse(
                answer="I cannot provide information about other employees due to privacy and security policies.",
                data=None,
                explanation="Employee data is restricted to individual access only.",
                policy_reference="DATA_PRIVACY_POLICY",
                next_steps=None
            ).__dict__

        try:
            # STEP 1 & 2: IntentResolver & ContextManager
            cls._resolve_intent_and_context(context, session_id)

            # STEP 3: Entity Extraction & Attachment Processing
            cls._extract_entities(context, session_id)
            if context.request.attachment:
                from hr_engine.modules.LLMService import LLMService
                context.attachment_content = LLMService.analyze_attachment(context.request.attachment)

            # STEP 4: Security Layer
            SecurityLayer.validate_permissions(context)

            # STEP 5: Data Access (or Fallbacks)
            cls._fetch_data(context)

            # STEP 6: Policy Engine
            cls._apply_policy(context)

            # STEP 7: Computation Engine
            cls._run_computation(context)

            # STEP 8: Response Builder
            ResponseBuilder.build(context)

        except Exception as error:
            # Preserve early fallback response structure if one was issued
            if context.response is None or not hasattr(context.response, 'answer') and not (isinstance(context.response, dict) and "answer" in context.response):
                context.response = BaseResponse(
                    answer="I am unable to complete your request.",
                    data=None,
                    explanation=str(error),
                    policy_reference=None,
                    next_steps="Please rephrase your query or contact an HR representative."
                )
        finally:
            # STEP 9: Audit Logger
            context_response = context.response
            resp_summary = "Error"
            if isinstance(context_response, dict):
                resp_summary = context_response.get("answer", "Error")
            elif context_response:
                resp_summary = getattr(context_response, "answer", "Error")

            AuditLogger.log_request({
                "employee_id": request.employee_id,
                "intent": str(context.intent),
                "data_accessed": list(context.data_fetched.keys()) if isinstance(context.data_fetched, dict) else [],
                "response_summary": resp_summary,
                "timestamp": time.time()
            })

            # Ensure pure dictionary format is returned downstream
            # Django JsonResponse expects dictionaries, not custom dataclasses by default (unless converted)
            if hasattr(context.response, "__dict__"):
                return context.response.__dict__
            return context.response

    @classmethod
    def _resolve_intent_and_context(cls, context: RequestContext, session_id: str):
        IntentResolver.resolve(context)
        session = ContextManager.get_context(session_id)
        accessed = session.get("accessed_domains", set())
        
        if context.intent == Intent.UNKNOWN:
            if len(accessed) > 1:
                context.response = BaseResponse(
                    answer="Are you referring to salary or leave?",
                    data=None,
                    explanation="You requested data from multiple domains recently. Please clarify.",
                    policy_reference=None,
                    next_steps="Specify 'salary' or 'leave'."
                )
                raise Exception("Cross-domain ambiguity detected.")
            elif len(accessed) == 1:
                context.intent = list(accessed)[0]
                context.sub_intent = context.sub_intent if context.sub_intent != SubIntent.UNKNOWN else session.get("last_sub_intent", SubIntent.UNKNOWN)
                context.entities.update(session.get("extracted_entities", {}))

        if session.get("last_intent") and context.intent != session.get("last_intent"):
            session["extracted_entities"] = {}
            context.entities = {}

        session = ContextManager.update_context(session_id, {
            "intent": context.intent,
            "sub_intent": context.sub_intent
        })

    @classmethod
    def _extract_entities(cls, context: RequestContext, session_id: str):
        import re
        from hr_engine.modules.LLMService import LLMService
        q = (context.request.query_text or "").lower()
        
        # Determine today's date context (from request if provided, or system)
        import datetime
        now = datetime.date.today()
        today_date = f"{now.strftime('%Y-%m-%d')} ({now.strftime('%A')})"
        
        if "simulate" in q or "hypothetical" in q:
            context.entities["simulation_mode"] = True
            
        # SEMANTIC INTENT CORRECTION
        if "without balance" in q:
            context.intent = Intent.LEAVE_QUERY
            context.sub_intent = SubIntent.SIMULATION
            context.entities["simulation_mode"] = True

        # AI-DRIVEN ENTITY EXTRACTION FOR APPLICATIONS
        if context.sub_intent == SubIntent.APPLY:
            params = LLMService.extract_leave_parameters(context.request.query_text, today_date)
            print(f"[DEBUG_ORCH] Extracted Params for {context.sub_intent}: {params}")
            if params:
                context.entities.update(params)
        else:
            # Fallback regex extraction for simple queries
            if "sick" in q:
                context.entities["leave_type"] = "SICK"
            elif "casual" in q:
                context.entities["leave_type"] = "CASUAL"
                
            nums = [int(n) for n in re.findall(r'\b\d+\b', q)]
            if "unpaid" in q or "lwp" in q or "without balance" in q:
                if len(nums) >= 1: context.entities["unpaid_days"] = nums[0]
            elif "leave" in q:
                if "history" in q or "applied" in q or "past" in q or "list" in q:
                     context.sub_intent = SubIntent.VIEW
                     context.entities["leave_history_mode"] = True
                if len(nums) >= 1: context.entities["requested_days"] = nums[0]

        # MONTH EXTRACTION FOR SALARY/LEAVE
        months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        month_map = {m: str(i+1).zfill(2) for i, m in enumerate(months)}
        
        extracted_month = None
        this_month_str = now.strftime('%Y-%m')
        # Calculate last month
        first_of_this_month = now.replace(day=1)
        last_month_date = first_of_this_month - datetime.timedelta(days=1)
        last_month_str = last_month_date.strftime('%Y-%m')

        if "this month" in q:
            extracted_month = this_month_str
        elif "last month" in q or "previous month" in q or "past month" in q:
            extracted_month = last_month_str
        else:
            # Check for month names and short versions
            month_keywords = {
                "january": "01", "jan": "01",
                "february": "02", "feb": "02",
                "march": "03", "mar": "03",
                "april": "04", "apr": "04",
                "may": "05",
                "june": "06", "jun": "06",
                "july": "07", "jul": "07",
                "august": "08", "aug": "08",
                "september": "09", "sep": "09",
                "october": "10", "oct": "10",
                "november": "11", "nov": "11",
                "december": "12", "dec": "12"
            }
            for kw, mm in month_keywords.items():
                if re.search(rf'\b{kw}\b', q):
                    year_match = re.search(r'\b(20\d{2})\b', q)
                    year = year_match.group(1) if year_match else "2026"
                    extracted_month = f"{year}-{mm}"
                    break
        
        if extracted_month:
            context.entities["month"] = extracted_month
        
        # We no longer aggressively delete 'month' to preserve context across follow-up queries.
        # It will be overwritten by the next month-specific query.

        print(f"[DEBUG_ORCH] Final Entities: {context.entities}")
        ContextManager.update_context(session_id, {"entities": context.entities})
        context.entities = ContextManager.get_context(session_id).get("extracted_entities", {})

    @classmethod
    def _fetch_data(cls, context: RequestContext):
        emp_id = context.request.employee_id
        
        if context.intent == Intent.PAYROLL_QUERY and context.sub_intent == SubIntent.ELIGIBILITY:
            fallback = FallbackHandler.generate_missing_data_response(
                "performance review scores",
                "calculate accurate bonus eligibility",
                "You may check your portal or contact HR."
            )
            context.response = fallback
            raise Exception("Triggered Fallback: Missing Data.")
        
        if context.intent in [Intent.LEAVE_QUERY, Intent.POLICY_QUERY]:
            # Always fetch leave balance and policies for leave/policy intents
            context.data_fetched = {
                "balance": DataAccessLayer.get_leave_balance(emp_id, current_user_id=context.request.employee_id),
                "policies": PolicyEngine.get_all_policies()
            }
        elif context.intent == Intent.PAYROLL_QUERY:
            context.data_fetched = DataAccessLayer.get_salary_records(emp_id, current_user_id=context.request.employee_id)
        elif context.intent == Intent.DOCUMENT_REQUEST:
            context.data_fetched = DataAccessLayer.get_documents(emp_id, current_user_id=context.request.employee_id)
        else:
            context.data_fetched = DataAccessLayer.get_employee(emp_id, context.request.organization_id, current_user_id=context.request.employee_id)

    @classmethod
    def _apply_policy(cls, context: RequestContext):
        if context.intent == Intent.LEAVE_QUERY:
            try:
                # Basic balance check against general policy
                balance_data = context.data_fetched.get("balance") if isinstance(context.data_fetched, dict) else context.data_fetched
                rule_status = PolicyEngine.execute_rules('general_leave_policy', 'L001', {'leave_balance': balance_data})
                if not rule_status.get('passed'):
                    context.response = BaseResponse(
                        answer="Your request violates company policy.",
                        data=None,
                        explanation=", ".join(rule_status.get("reasons", [])),
                        policy_reference=rule_status.get("policy_reference"),
                        next_steps="Review the policy document."
                    )
                    raise Exception("Policy Violation Bypassed Pipeline.")
                context.policy_reference = {"policy_name": 'general_leave_policy', "clause_reference": 'L001'}
            except Exception as e:
                if "Policy Violation" in str(e): raise
                # Don't crash on policy lookup if data_fetched structure differs (e.g. for pure policy queries)
                pass

    @classmethod
    def _run_computation(cls, context: RequestContext):
        emp_id = context.request.employee_id
        curr_id = context.request.employee_id
        
        if context.intent == Intent.LEAVE_QUERY:
            if context.sub_intent == SubIntent.APPLY:
                lt = context.entities.get("leave_type", "CASUAL")
                fd = context.entities.get("from_date")
                td = context.entities.get("to_date")
                re = context.entities.get("reason")
                if not fd or not td:
                    raise Exception("Please specify the dates for your leave application.")
                context.computation_result = ComputationEngine.submit_leave_request(emp_id, curr_id, lt, fd, td, re)
            elif context.sub_intent == SubIntent.SIMULATION or context.entities.get("simulation_mode"):
                req_days = context.entities.get("requested_days")
                unpaid_days = context.entities.get("unpaid_days")
                ltype = context.entities.get("leave_type")
                if req_days is None and unpaid_days is None:
                    raise Exception("Please specify the exact number of days.")
                if unpaid_days:
                    context.computation_result = ComputationEngine.simulate_lwp(emp_id, curr_id, unpaid_days)
                else:
                    context.computation_result = ComputationEngine.simulate_leave(emp_id, curr_id, req_days, leave_type=ltype)
            else:
                ltype = context.entities.get("leave_type")
                if context.entities.get("leave_history_mode"):
                    context.computation_result = ComputationEngine.calculate_leave_history(emp_id, curr_id)
                else:
                    context.computation_result = ComputationEngine.calculate_leave_balance(emp_id, curr_id, leave_type=ltype)
        elif context.intent == Intent.PAYROLL_QUERY:
            month = context.entities.get("month")
            if context.sub_intent in [SubIntent.COMPARE, SubIntent.EXPLAIN]:
                context.computation_result = ComputationEngine.compare_salary(emp_id, curr_id, current_month=month)
            else:
                context.computation_result = ComputationEngine.calculate_salary_breakdown(emp_id, curr_id, month=month)
