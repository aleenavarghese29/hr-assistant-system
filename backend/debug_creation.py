import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from hr_engine.serializers import EmployeeSerializer
from hr_engine.models import Employee

data = {
    "employee_id": "TEST999",
    "name": "Test User",
    "professional_email": "test.user@company.com",
    "role": "Tester",
    "salary_structure": {"base_salary": 5000},
    "leave_records": {"leave_balances": {}}
}

serializer = EmployeeSerializer(data=data)
if serializer.is_valid():
    try:
        serializer.save()
        print("Employee created successfully")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("Serializer errors:", serializer.errors)
