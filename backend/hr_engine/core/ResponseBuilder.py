from hr_engine.types import RequestContext, SubIntent, BaseResponse, Intent

class ResponseBuilder:
    @staticmethod
    def build(context: RequestContext) -> BaseResponse:
        # Check bypass routes entirely
        if context.response is not None and getattr(context.response, 'answer', None):
            return context.response
            
        if isinstance(context.response, dict) and "answer" in context.response:
            return BaseResponse(**context.response)

        answer = "I have successfully retrieved your requested information."
        explanation = "Action completed based on standard employee policies."
        next_steps = "No further action needed."
        
        data_payload = context.computation_result if context.computation_result is not None else context.data_fetched

        if context.computation_result and isinstance(context.computation_result, dict):
            comp = context.computation_result
            comp_type = comp.get("type")
            
            # --- NLP HUMANIZED GENERATOR ---
            if comp_type == "MISSING_DATA":
                 answer = comp.get("answer")
                 explanation = comp.get("explanation")
                 
            elif comp_type == "ERROR":
                 answer = comp.get("answer")
                 explanation = comp.get("explanation")
                 next_steps = "Please adjust your dates and try again."
                 
            elif comp_type == "SALARY_BREAKDOWN":
                 net_sal = comp.get("net_salary", 0)
                 lwp = comp.get("lwp_days", 0)
                 tax = comp.get("deductions", {}).get("tax", 0)
                 base = comp.get("earnings", {}).get("base_salary", 0)
                 month_val = comp.get("month", "the requested month")
                 
                 answer = f"Your net salary for {month_val} is ₹{net_sal}."
                 
                 reasons = []
                 if lwp > 0:
                     reasons.append(f"you had {lwp} unpaid leave days processed")
                 if tax > 0:
                     reasons.append(f"standard tax deductions of ₹{tax} were mapped")
                 
                 if reasons:
                     explanation = f"Your payout changed because {' and '.join(reasons)}."
                 else:
                     explanation = "Your payout matches the standard baseline contractual metrics without deviations."

            elif comp_type == "LEAVE_HISTORY":
                 answer = comp.get("answer")
                 explanation = comp.get("explanation")

            elif comp_type == "LEAVE_BALANCE":
                 balances = comp.get("leave_balances", {})
                 ans_parts = []
                 for l_type, l_data in balances.items():
                     ans_parts.append(f"{l_data.get('pending')} {l_type.lower()} leaves")
                     
                 if len(ans_parts) > 0:
                     answer = f"You currently have {' and '.join(ans_parts)} available."
                     explanation = "This is dynamically structured directly from your comprehensive annual allocated quotas minus your real-time verified consumptions."
                 else:
                     answer = "I could not find specific leave matrices for your profile."

            elif comp_type == "SALARY_COMPARISON":
                 answer = "Here is the thorough alignment looking at your recent historical paycycles."
                 explanation = "Your earnings and deductions have been graphed sequentially to note specific operational changes in unpaid leaves and constraints."
                 
            elif comp_type == "LEAVE_SIMULATION":
                 req_days = comp.get("requested_days", 0)
                 reason = comp.get("reason", "")
                 if comp.get("would_be_approved", False):
                     answer = f"Yes, you can absolutely schedule a {req_days}-day leave."
                     explanation = f"You hold adequate active balances and satisfy notice periods. {reason}"
                 else:
                     answer = f"No, unfortunately you cannot take this {req_days}-day leave right now."
                     explanation = f"Because {reason.lower()}."
                     
            elif comp_type == "LEAVE_SIMULATION_LWP":
                 answer = comp.get("answer")
                 explanation = comp.get("explanation")

            elif comp_type == "LEAVE_SUBMISSION":
                 answer = comp.get("answer")
                 explanation = comp.get("explanation")
                 next_steps = "Wait for admin approval in the dashboard."
                     
        elif context.intent == Intent.PROFILE_QUERY and isinstance(context.data_fetched, dict):
             # Ensure exhaustive profile mapping uses generic native responses mapping against the parsed Payload natively.
             emp = context.data_fetched
             first_name = emp.get("name", "Employee").split(" ")[0]
             answer = f"I've got your profile right here, {first_name}."
             explanation = "If you ever need to update your emergency contacts or address, let me know!"
             query = (context.request.query_text or "").lower()
             if "blood" in query: data_payload = {"Blood Group": emp.get("blood_group")}
             elif "contact" in query or "emergency" in query: data_payload = {"Emergency Contact": emp.get("emergency_contact_name"), "Number": emp.get("emergency_contact_number")}
             elif "address" in query: data_payload = {"Address": emp.get("address")}
             else: data_payload = {"Employee ID": emp.get("employee_id"), "Role": emp.get("job_title"), "Department": emp.get("department")}
        elif context.intent == Intent.POLICY_QUERY:
             answer = "Here is the exact policy information."
             explanation = "This is a global company policy."
             data_payload = context.data_fetched
             
        elif context.data_fetched:
            answer = "Let me help with that."
            explanation = "I'm looking into this for you."
            data_payload = None  # Never dump raw fetched data — LLM will populate abstracted_data

        policy_ref = None
        if getattr(context, 'policy_reference', None):
            pr = context.policy_reference
            if isinstance(pr, dict):
                policy_ref = f"{pr.get('policy_name')} ({pr.get('clause_reference')})"
            else:
                policy_ref = f"{pr.policy_name} ({pr.clause_reference})"

        final_answer = answer
        final_explanation = explanation

        try:
             import importlib
             import hr_engine.modules.LLMService
             importlib.reload(hr_engine.modules.LLMService)
             from hr_engine.modules.LLMService import LLMService
             from hr_engine.modules.DataAccessLayer import DataAccessLayer
             
             full_schema = DataAccessLayer.get_employee(context.request.employee_id, context.request.organization_id, context.request.employee_id)
             
             from hr_engine.models import CompanyHoliday
             holidays = list(CompanyHoliday.objects.all().values('date', 'name', 'type').order_by('date'))
             
             # Slim down employee context — strip heavy array fields to prevent token overflow
             if full_schema and isinstance(full_schema, dict):
                 slim_schema = {k: v for k, v in full_schema.items() if k not in ('monthly_salaries',)}
                 # Summarize leave_history instead of passing all objects
                 lh = full_schema.get('leave_history', [])
                 if lh:
                     slim_schema['leave_history_summary'] = [
                         {"type": h.get('leave_type'), "status": h.get('status'), "dates": f"{h.get('from_date')} to {h.get('to_date')}", "days": h.get('days')}
                         for h in lh[:10]
                     ]
             else:
                 slim_schema = full_schema

             from hr_engine.modules.PolicyEngine import PolicyEngine
             all_policies = PolicyEngine.get_all_policies()

             from datetime import date
             today_str = date.today().isoformat()
             # Only pass holidays on/after today so LLM correctly identifies the NEXT upcoming one
             future_holidays = [h for h in holidays if str(h['date']) >= today_str]

             llm_payload = {
                 "query": context.request.query_text,
                 "computed_data": data_payload,
                 "employee_context": slim_schema,
                 "policy_active": policy_ref,
                 "all_policies": all_policies,
                 "company_holidays": future_holidays,
                 "today_date": today_str,
                 "attachment_content": context.attachment_content
             }
             llm_resp = LLMService.generate_response(llm_payload)
             if llm_resp:
                 # Only override the answer if it's NOT a deterministic SALARY_BREAKDOWN or if LLM found something better
                 # For SALARY_BREAKDOWN, we prefer our deterministic 'final_answer' set above.
                 if not (context.intent == Intent.PAYROLL_QUERY and context.computation_result and context.computation_result.get("type") == "SALARY_BREAKDOWN"):
                     final_answer = llm_resp.get("answer", final_answer)
                     # Also only use abstracted data if NOT a deterministic breakdown to prevent loss of sub-fields (HRA, Tax, etc)
                     abstracted = llm_resp.get("abstracted_data")
                     data_payload = abstracted if abstracted else data_payload
                 
                 final_explanation = llm_resp.get("explanation", final_explanation)
        except Exception as e:
             print(f"[LLM FAIL-SAFE] Defaulting to deterministic strings. Reason: {str(e)}")

        final_response = BaseResponse(
            answer=final_answer,
            data=data_payload if context.intent != Intent.POLICY_QUERY else None,
            explanation=final_explanation,
            policy_reference=policy_ref,
            next_steps=next_steps
        )

        context.response = final_response
        return final_response
