import os, django, datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from hr_engine.models import Employee, SalaryStructure, SalaryRecord, LeaveRecord, Policy, Document, LeaveHistory

if not Employee.objects.filter(employee_id="EMP001").exists():
    emp = Employee.objects.create(
        employee_id="EMP001",
        organization_id="ORG001",
        # Job Info
        date_of_joining=datetime.date(2023, 1, 15),
        department="Engineering",
        role="Administrator",
        professional_email="akhil@company.com",
        job_title="Senior Software Engineer",
        office_location="HQ Branch A",
        employment_type="FULL_TIME",
        probation_start_date=datetime.date(2023, 1, 15),
        probation_end_date=datetime.date(2023, 7, 15),
        work_status="ACTIVE",
        # Basic Info
        name="Akhil",
        gender="Male",
        date_of_birth=datetime.date(1993, 5, 20),
        blood_group="O+",
        marital_status="Single",
        nationality="Indian",
        # Contact Info
        phone_number="+91-9876543210",
        personal_email="akhil.private@gmail.com",
        address="Sector 14, Main Road",
        postal_code="110001",
        country="India",
        state="Delhi",
        district_county="New Delhi",
        emergency_contact_name="Ramesh",
        emergency_contact_number="+91-9998887776"
    )
    
    SalaryStructure.objects.create(
        employee=emp,
        base_salary=90000,
        bonus=14000,
        allowances={"hra": 10000, "transport": 3000},
        deductions={"tax": 4000, "pf": 2000},
        pay_cycle="MONTHLY",
        currency="INR"
    )

    LeaveRecord.objects.create(
        employee=emp,
        leave_balances={
            "SICK": {"total": 10, "used": 2, "pending": 1},
            "CASUAL": {"total": 12, "used": 2, "pending": 0}
        }
    )

    LeaveHistory.objects.create(
        employee=emp,
        from_date=datetime.date(2025, 2, 10),
        to_date=datetime.date(2025, 2, 11),
        days=2,
        leave_type="SICK",
        reason="Viral Fever",
        status="Approved"
    )
    LeaveHistory.objects.create(
        employee=emp,
        from_date=datetime.date(2025, 4, 20),
        to_date=datetime.date(2025, 4, 21),
        days=2,
        leave_type="CASUAL",
        reason="Family function",
        status="Approved"
    )

    Policy.objects.create(
        policy_name="leave_policy",
        description="Comprehensive Leave Constraints",
        rules={
            "types": {
                "SICK": {"max_per_year": 10, "carry_forward": False, "requires_approval": True},
                "CASUAL": {"max_per_year": 12, "carry_forward": True, "max_carry_forward": 5}
            },
            "constraints": {"notice_period_days": 2, "max_consecutive_days": 5},
            "lwp": {"allowed": True, "requires_exhaustion": True}
        }
    )

    Policy.objects.create(
        policy_name="payroll_policy",
        description="Payroll deductions explicitly mapped",
        rules={
            "lwp_deduction": {"enabled": True, "formula": "base_salary / working_days * lwp_days"},
            "bonus": {"enabled": True, "requires_performance_review": True}
        }
    )

    print("Massive analytical seed structure initialized successfully.")
