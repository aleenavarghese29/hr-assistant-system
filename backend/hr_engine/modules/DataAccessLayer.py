from hr_engine.models import Employee, SalaryRecord, LeaveRecord, Document
from hr_engine.serializers import EmployeeSerializer
from typing import Dict, Any, List

class DataAccessLayer:
    @classmethod
    def get_employee(cls, employee_id: str, org_id: str, current_user_id: str) -> Dict[str, Any]:
        if employee_id != current_user_id:
            raise PermissionError(f"ForbiddenError: requested {employee_id} !== current {current_user_id}")
        try:
            emp = Employee.objects.get(employee_id=employee_id, organization_id=org_id)
            return EmployeeSerializer(emp).data
        except Employee.DoesNotExist:
            raise Exception(f"Data fetch failed: Unauthorized access or employee {employee_id} not found.")

    @classmethod
    def get_salary_records(cls, employee_id: str, current_user_id: str) -> List[Dict[str, Any]]:
        if employee_id != current_user_id:
            raise PermissionError(f"ForbiddenError: requested {employee_id} !== current {current_user_id}")
        salaries = SalaryRecord.objects.filter(employee_id=employee_id).order_by('-month')
        return [
            {
                "month": s.month,
                "earnings": s.earnings,
                "deductions": s.deductions,
                "net_salary": s.net_salary,
                "lwp_days": s.lwp_days,
                "base_daily_rate": s.base_daily_rate,
                "id": s.id
            } for s in salaries
        ]

    @classmethod
    def get_leave_balance(cls, employee_id: str, current_user_id: str) -> Dict[str, Any]:
        if employee_id != current_user_id:
            raise PermissionError(f"ForbiddenError: requested {employee_id} !== current {current_user_id}")
        try:
            leave = LeaveRecord.objects.get(employee_id=employee_id)
            t = sum(v.get('total', 0) for v in leave.leave_balances.values())
            u = sum(v.get('used', 0) for v in leave.leave_balances.values())
            p = sum(v.get('pending', 0) for v in leave.leave_balances.values())
            return {"total": t, "used": u, "pending": p, "remaining": t - u - p, "leave_balances": leave.leave_balances}
        except LeaveRecord.DoesNotExist:
            return {"total": 0, "used": 0, "pending": 0, "remaining": 0}

    @classmethod
    def get_leave_history(cls, employee_id: str, current_user_id: str) -> List[Dict[str, Any]]:
        if employee_id != current_user_id:
            raise PermissionError(f"ForbiddenError: requested {employee_id} !== current {current_user_id}")
        from hr_engine.models import LeaveHistory
        leaves = LeaveHistory.objects.filter(employee_id=employee_id).order_by('-from_date')
        return [
            {
                "id": l.id,
                "from_date": l.from_date,
                "to_date": l.to_date,
                "days": l.days,
                "leave_type": l.leave_type,
                "reason": l.reason,
                "status": l.status
            } for l in leaves
        ]

    @classmethod
    def get_documents(cls, employee_id: str, current_user_id: str) -> List[Dict[str, Any]]:
        if employee_id != current_user_id:
            raise PermissionError(f"ForbiddenError: requested {employee_id} !== current {current_user_id}")
        docs = Document.objects.filter(employee_id=employee_id)
        return [{"type": d.doc_type, "document_id": d.document_id, "file_path": d.file_path, "month": d.month} for d in docs]

    @classmethod
    def create_leave_history(cls, employee_id: str, leave_type: str, from_date: str, to_date: str, reason: str, days: float) -> Dict[str, Any]:
        from hr_engine.models import LeaveHistory, Employee
        emp = Employee.objects.get(employee_id=employee_id)
        lh = LeaveHistory.objects.create(
            employee=emp,
            employee_id=employee_id,
            leave_type=leave_type,
            from_date=from_date,
            to_date=to_date,
            reason=reason,
            days=days,
            status='PENDING'
        )
        return {"id": lh.id, "status": lh.status}
