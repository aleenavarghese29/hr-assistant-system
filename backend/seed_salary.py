import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from hr_engine.models import Employee, SalaryRecord

emp = Employee.objects.get(employee_id="EMP001")
if not SalaryRecord.objects.filter(employee=emp).exists():
    SalaryRecord.objects.create(
        employee=emp,
        month="2025-02",
        earnings={"base_salary": 90000, "bonus": 0, "hra": 10000, "transport": 3000},
        deductions={"tax": 4000, "pf": 2000, "lwp": 0},
        net_salary=97000,
        lwp_days=0,
        base_daily_rate=3000
    )
    print("Injected monthly salary record.")
else:
    print("Salary record already exists.")
