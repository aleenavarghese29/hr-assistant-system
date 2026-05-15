from typing import Optional, Dict, Any
from hr_engine.modules.DataAccessLayer import DataAccessLayer

class DerivedDataService:
    @staticmethod
    def get_leave_balance_summary(employee_id: str, current_user_id: str) -> Dict[str, Any]:
        return DataAccessLayer.get_leave_balance(employee_id, current_user_id)

    @staticmethod
    def get_leave_history(employee_id: str, current_user_id: str) -> list:
        return DataAccessLayer.get_leave_history(employee_id, current_user_id)

    @staticmethod
    def get_salary_breakdown(employee_id: str, current_user_id: str, month: str = None) -> Optional[Dict[str, Any]]:
        records = DataAccessLayer.get_salary_records(employee_id, current_user_id)
        if not records:
            return None
            
        if month:
            for r in records:
                if r.get("month") == month:
                    return r
        return records[0] # Default latest (since sorted -month)

    @staticmethod
    def get_salary_comparison(employee_id: str, current_user_id: str, current_month: str = None, previous_month: str = None) -> Optional[Dict[str, Any]]:
        records = DataAccessLayer.get_salary_records(employee_id, current_user_id)
        if not records or len(records) < 2:
            return None
        # Newest first: records[0] is latest, records[1] is previous
        return {
            "period1": records[1],
            "period2": records[0]
        }

    @staticmethod
    def get_latest_base_salary(employee_id: str, current_user_id: str) -> float:
        latest = DerivedDataService.get_salary_breakdown(employee_id, current_user_id)
        if latest and "earnings" in latest:
            return latest["earnings"].get("base_salary", 0)
        return 0


