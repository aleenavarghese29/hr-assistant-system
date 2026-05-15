import os, django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from hr_engine.models import Employee, SalaryRecord

def run():
    try:
        emp = Employee.objects.get(employee_id='EMP001')
    except Exception as e:
        print(f"Error fetching EMP001: {e}")
        return

    SalaryRecord.objects.filter(employee=emp).delete()

    months = []
    # Gen months from Jan 2023 to April 2026
    for y in range(2023, 2027):
        for m in range(1, 13):
            if y == 2026 and m > 4:
                break
            months.append(f"{y}-{str(m).zfill(2)}")
            
    print(f"Seeding {len(months)} months.")
            
    earnings = {"base_salary": 90000.0, "bonus": 14000.0, "hra": 10000.0}
    deductions = {"tax": 4000.0}
    net_salary = 110000.0
    
    records = []
    for m in months:
        records.append(SalaryRecord(
            employee=emp,
            month=m,
            earnings=earnings,
            deductions=deductions,
            net_salary=net_salary,
            lwp_days=0.0,
            base_daily_rate=3000.0
        ))
    
    SalaryRecord.objects.bulk_create(records)
    print("Seeded successfully.")

if __name__ == '__main__':
    run()
