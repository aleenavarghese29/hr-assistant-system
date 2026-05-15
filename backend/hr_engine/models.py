from django.db import models
from django.contrib.auth.models import User

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    # Job Info
    employee_id = models.CharField(max_length=50, unique=True, primary_key=True)
    organization_id = models.CharField(max_length=50, default='ORG001', blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    department = models.CharField(max_length=100, default='', blank=True)
    role = models.CharField(max_length=100, default='', blank=True)
    professional_email = models.EmailField(default='no-reply@company.com', blank=True)
    job_title = models.CharField(max_length=100, default='', blank=True)
    office_location = models.CharField(max_length=100, default='', blank=True)
    employment_type = models.CharField(max_length=50, default='FULL_TIME', blank=True)
    probation_start_date = models.DateField(null=True, blank=True)
    probation_end_date = models.DateField(null=True, blank=True)
    work_status = models.CharField(max_length=50, default='ACTIVE', blank=True)

    # Basic Info
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=50, default='', blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=10, default='', blank=True)
    marital_status = models.CharField(max_length=50, default='', blank=True)
    nationality = models.CharField(max_length=50, default='', blank=True)
    profile_picture = models.CharField(max_length=255, null=True, blank=True)

    # Contact Info
    phone_number = models.CharField(max_length=20, default='', blank=True)
    personal_email = models.EmailField(default='', blank=True)
    address = models.TextField(default='', blank=True)
    postal_code = models.CharField(max_length=20, default='', blank=True)
    country = models.CharField(max_length=50, default='', blank=True)
    state = models.CharField(max_length=50, default='', blank=True)
    district_county = models.CharField(max_length=50, default='', blank=True)
    emergency_contact_name = models.CharField(max_length=100, default='', blank=True)
    emergency_contact_number = models.CharField(max_length=20, default='', blank=True)

class LeaveHistory(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_history')
    from_date = models.DateField()
    to_date = models.DateField()
    days = models.FloatField()
    leave_type = models.CharField(max_length=50)
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50)

class SalaryStructure(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='salary_structure')
    base_salary = models.FloatField()
    bonus = models.FloatField(default=0)
    allowances = models.JSONField(default=dict)
    deductions = models.JSONField(default=dict)
    pay_cycle = models.CharField(max_length=50, default='MONTHLY')
    currency = models.CharField(max_length=10, default='INR')

class SalaryRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='monthly_salaries')
    month = models.CharField(max_length=20)
    earnings = models.JSONField(default=dict)
    deductions = models.JSONField(default=dict)
    net_salary = models.FloatField()
    lwp_days = models.FloatField(default=0)
    base_daily_rate = models.FloatField()

class LeaveRecord(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='leave_records')
    leave_balances = models.JSONField(default=dict)

class Document(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=100)
    document_id = models.CharField(max_length=50, unique=True)
    file_path = models.CharField(max_length=255)
    month = models.CharField(max_length=20, null=True, blank=True)

class Policy(models.Model):
    policy_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    rules = models.JSONField(default=dict)

class CompanyBranding(models.Model):
    company_name = models.CharField(max_length=100, default='ALLUS CORP')
    logo_url = models.CharField(max_length=255, null=True, blank=True)
    theme_color = models.CharField(max_length=20, default='#4338ca')
    custom_html = models.TextField(null=True, blank=True)

class CompanyHoliday(models.Model):
    date = models.DateField(unique=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50, default='MANDATORY') # MANDATORY or OPTIONAL

