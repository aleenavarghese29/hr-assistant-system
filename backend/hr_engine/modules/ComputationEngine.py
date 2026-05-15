from hr_engine.modules.DerivedDataService import DerivedDataService
from typing import Optional, Dict, Any

class ComputationEngine:
    @staticmethod
    def calculate_salary_breakdown(employee_id: str, current_user_id: str, month: str = None) -> Optional[Dict[str, Any]]:
        record = DerivedDataService.get_salary_breakdown(employee_id, current_user_id, month)
        if not record:
            return None

        total_earnings = sum(record.get("earnings", {}).values())
        total_deductions = sum(record.get("deductions", {}).values())
        computed_net = total_earnings - total_deductions
        
        db_net = record.get("net_salary")
        if db_net is not None and abs(computed_net - db_net) > 0.01:
            raise Exception(f"NUMERICAL VALIDATION FAILED: Computed {computed_net} != Record {db_net}")

        return {
            "type": "SALARY_BREAKDOWN",
            "month": record.get("month"),
            "earnings": record.get("earnings"),
            "total_earnings": total_earnings,
            "deductions": record.get("deductions"),
            "total_deductions": total_deductions,
            "net_salary": total_earnings - total_deductions,
            "explanation": f"Computed strict salary breakdown for {record.get('month', 'latest')} yielding {total_earnings - total_deductions} net."
        }

    @staticmethod
    def compare_salary(employee_id: str, current_user_id: str, current_month: str = None, previous_month: str = None) -> Optional[Dict[str, Any]]:
        data = DerivedDataService.get_salary_comparison(employee_id, current_user_id, current_month, previous_month)
        if not data:
            partial = ComputationEngine.calculate_salary_breakdown(employee_id, current_user_id, current_month)
            if partial:
                partial["explanation"] = "Only partial data is available for comparison. Generating precise breakdown for current period instead."
                return partial
            return {
                "type": "MISSING_DATA",
                "answer": "I do not have enough data to determine the exact reason.",
                "explanation": "I do not have enough data to determine the exact reason."
            }

        record1 = data["period1"]
        record2 = data["period2"]
        net_difference = record2.get("net_salary", 0) - record1.get("net_salary", 0)
        differences: Dict[str, float] = {}

        all_earnings = {**record1.get("earnings", {}), **record2.get("earnings", {})}
        for key in all_earnings:
            diff = record2.get("earnings", {}).get(key, 0) - record1.get("earnings", {}).get(key, 0)
            if diff != 0:
                differences[f"earnings.{key}"] = diff

        all_deductions = {**record1.get("deductions", {}), **record2.get("deductions", {})}
        for key in all_deductions:
            diff = record2.get("deductions", {}).get(key, 0) - record1.get("deductions", {}).get(key, 0)
            if diff != 0:
                differences[f"deductions.{key}"] = diff

        comp_str = ", ".join(differences.keys())
        if net_difference > 0:
            exp = f"Net salary increased due to changes in {comp_str}."
        elif net_difference < 0:
            exp = f"Net salary decreased by {abs(net_difference)}. Changed components: {comp_str}."
        else:
            if len(differences) == 0:
                exp = "No change detected in available data"
            else:
                exp = f"Net salary remained the same, but components shifted internally: {comp_str}."

        return {
            "type": "SALARY_COMPARISON",
            "differences": differences,
            "period1": record1.get("month"),
            "period2": record2.get("month"),
            "net_difference": net_difference,
            "explanation": exp
        }

    @staticmethod
    def calculate_leave_history(employee_id: str, current_user_id: str) -> Dict[str, Any]:
        history = DerivedDataService.get_leave_history(employee_id, current_user_id)
        if not history:
             return {"type": "LEAVE_HISTORY", "answer": "You have no applied leaves recorded.", "explanation": "Leave history is empty."}
        formatted = [{"dates": f"{h['from_date']} to {h['to_date']}", "days": h['days'], "type": h['leave_type'], "status": h['status']} for h in history]
        return {
            "type": "LEAVE_HISTORY",
            "history": formatted,
            "answer": f"You have {len(history)} explicitly applied leaves.",
            "explanation": "Here is the comprehensive list of applied leaves."
        }


    @staticmethod
    def calculate_leave_balance(employee_id: str, current_user_id: str, leave_type: str = None) -> Dict[str, Any]:
        balance = DerivedDataService.get_leave_balance_summary(employee_id, current_user_id)
        if leave_type and balance.get("leave_balances") and leave_type.upper() in balance["leave_balances"]:
            specific = balance["leave_balances"][leave_type.upper()]
            rem = specific.get("total", 0) - specific.get("used", 0) - specific.get("pending", 0)
            return {
                "type": "LEAVE_BALANCE",
                "total": specific.get("total", 0),
                "used": specific.get("used", 0),
                "pending": specific.get("pending", 0),
                "remaining": rem,
                "leave_type": leave_type.upper(),
                "explanation": f"You have {rem} days of available {leave_type} leave."
            }
            
        rem = balance.get("remaining", 0)
        return {
            "type": "LEAVE_BALANCE",
            "total": balance.get("total", 0),
            "used": balance.get("used", 0),
            "pending": balance.get("pending", 0),
            "remaining": rem,
            "detailed_breakdown": balance.get("leave_balances"),
            "explanation": f"You have {rem} days of available leave based on aggregated standard quotas."
        }

    @staticmethod
    def simulate_leave(employee_id: str, current_user_id: str, requested_days: float, leave_type: str = None) -> Dict[str, Any]:
        balance = DerivedDataService.get_leave_balance_summary(employee_id, current_user_id)
        
        if leave_type and balance.get("leave_balances") and leave_type.upper() in balance["leave_balances"]:
            specific = balance["leave_balances"][leave_type.upper()]
            rem_current = specific.get("total", 0) - specific.get("used", 0) - specific.get("pending", 0)
            new_remaining = rem_current - requested_days
            return {
                "type": "LEAVE_SIMULATION",
                "requested_days": requested_days,
                "leave_type": leave_type.upper(),
                "would_be_approved": new_remaining >= 0,
                "future_balance": {
                    "total": specific.get("total", 0),
                    "used": specific.get("used", 0),
                    "pending": specific.get("pending", 0) + requested_days,
                    "remaining": specific.get("remaining", 0) if new_remaining < 0 else new_remaining
                },
                "reason": f"Insufficient {leave_type} balance. Missing {abs(new_remaining)} days." if new_remaining < 0 else "Simulation successful. Sufficient leave balance.",
                "explanation": f"Simulating a request of {requested_days} days against your {leave_type} quota."
            }

        new_remaining = balance.get("remaining", 0) - requested_days
        
        return {
            "type": "LEAVE_SIMULATION",
            "requested_days": requested_days,
            "would_be_approved": new_remaining >= 0,
            "future_balance": {
                "total": balance.get("total", 0),
                "used": balance.get("used", 0),
                "pending": balance.get("pending", 0) + requested_days,
                "remaining": balance.get("remaining", 0) if new_remaining < 0 else new_remaining
            },
            "detailed_breakdown": balance.get("leave_balances"),
            "reason": f"Insufficient aggregate balance. Missing {abs(new_remaining)} days." if new_remaining < 0 else "Simulation successful. Sufficient aggregated leave balance.",
            "explanation": f"Simulating a request of {requested_days} days against your aggregate quota."
        }

    @staticmethod
    def simulate_lwp(employee_id: str, current_user_id: str, lwp_days: float) -> Dict[str, Any]:
        breakdown = ComputationEngine.calculate_salary_breakdown(employee_id, current_user_id)
        if not breakdown:
           return {
               "type": "MISSING_DATA",
               "answer": "I do not have enough data to determine the exact reason.",
               "explanation": "I do not have enough data to determine the exact reason."
           }
        base_salary = breakdown.get("earnings", {}).get("base_salary", 0)
        net_curr = breakdown.get("net_salary", 0)
        lwp_deduction = (base_salary / 30.0) * lwp_days
        new_net = net_curr - lwp_deduction
        
        return {
            "type": "LEAVE_SIMULATION_LWP",
            "unpaid_days": lwp_days,
            "deduction_amount": round(lwp_deduction, 2),
            "new_net_salary": round(new_net, 2),
            "answer": f"If you take {lwp_days} unpaid leave days:\n* You will lose ₹{round(lwp_deduction, 2)} from your salary\n* Your updated net salary will be ₹{round(new_net, 2)}",
            "explanation": "LWP affects salary only. Computed against 30 standard working days."
        }

    @staticmethod
    def submit_leave_request(employee_id: str, current_user_id: str, leave_type: str, from_date: str, to_date: str, reason: str = None) -> Dict[str, Any]:
        from datetime import datetime, timedelta
        from hr_engine.models import CompanyHoliday
        from hr_engine.modules.DataAccessLayer import DataAccessLayer
        
        d1 = datetime.strptime(from_date, "%Y-%m-%d")
        d2 = datetime.strptime(to_date, "%Y-%m-%d")
        
        # Calculate effective days (exclude weekends and mandatory holidays)
        holidays = {h.date.strftime("%Y-%m-%d") for h in CompanyHoliday.objects.filter(type='MANDATORY')}
        total_days = 0
        curr = d1
        print(f"[DEBUG_LEAVE] Request: {from_date} to {to_date} | Weekday1: {d1.weekday()} | Weekday2: {d2.weekday()}")
        while curr <= d2:
            date_str = curr.strftime("%Y-%m-%d")
            is_wknd = curr.weekday() >= 5
            is_hol = date_str in holidays
            print(f"[DEBUG_LEAVE] Checking {date_str}: weekend={is_wknd}, holiday={is_hol}")
            if not is_wknd and not is_hol:
                total_days += 1
            curr += timedelta(days=1)
            
        if total_days == 0:
            return {"type": "ERROR", "answer": f"The requested period ({from_date} to {to_date}) contains no working days.", "explanation": f"Request denied: The dates you selected fall on weekends or company holidays. (Holidays counted: {len(holidays)})"}
            
        # Create record
        record = DataAccessLayer.create_leave_history(employee_id, leave_type, from_date, to_date, reason or "Applied via Assistant", total_days)
        
        return {
            "type": "LEAVE_SUBMISSION",
            "leave_id": record["id"],
            "status": record["status"],
            "days": total_days,
            "leave_type": leave_type,
            "dates": f"{from_date} to {to_date}",
            "answer": f"Successfully submitted a {leave_type} request for {total_days} day(s) ({from_date} to {to_date}).",
            "explanation": "Your request has been queued for admin approval. Status: PENDING."
        }
