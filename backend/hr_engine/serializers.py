from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Employee, SalaryStructure, SalaryRecord, LeaveRecord, Document, Policy, LeaveHistory, CompanyBranding, CompanyHoliday

class SalaryStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryStructure
        fields = '__all__'
        extra_kwargs = {'employee': {'read_only': True}}

class SalaryRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryRecord
        fields = '__all__'

class LeaveRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRecord
        fields = '__all__'
        extra_kwargs = {'employee': {'read_only': True}}

class LeaveHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveHistory
        fields = '__all__'

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'

class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = '__all__'

class CompanyBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyBranding
        fields = '__all__'

class CompanyHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyHoliday
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    salary_structure = SalaryStructureSerializer(required=False)
    leave_records = LeaveRecordSerializer(required=False)
    leave_history = LeaveHistorySerializer(many=True, read_only=True)
    monthly_salaries = SalaryRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'

    def to_internal_value(self, data):
        # Convert empty strings to None for date fields to prevent validation errors
        date_fields = ['date_of_birth', 'date_of_joining', 'probation_start_date', 'probation_end_date']
        # The data might be a QueryDict (from request.data) which is immutable, so we make a copy if needed
        if hasattr(data, 'dict'):
             data = data.dict()
        else:
             data = data.copy()
             
        for field in date_fields:
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)

    def create(self, validated_data):
        salary_data = validated_data.pop('salary_structure', None)
        leave_data = validated_data.pop('leave_records', None)
        
        # Create a linked Django User for authentication
        email = validated_data.get('professional_email', 'no-reply@company.com')
        # Use email as username for consistency
        user, _ = User.objects.get_or_create(
            username=email, 
            defaults={'email': email, 'is_staff': False}
        )
        user.set_password('Welcome@123') # Initial temporary password
        user.save()

        employee = Employee.objects.create(user=user, **validated_data)
        if salary_data:
            SalaryStructure.objects.create(employee=employee, **salary_data)
        if leave_data:
            LeaveRecord.objects.create(employee=employee, **leave_data)
        return employee

    def update(self, instance, validated_data):
        salary_data = validated_data.pop('salary_structure', None)
        leave_data = validated_data.pop('leave_records', None)
        print(f"[DEBUG_UPDATE] Updating Employee {instance.employee_id}. Validated data keys: {list(validated_data.keys())}")
        print(f"[DEBUG_UPDATE] Salary data received: {salary_data}")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if salary_data is not None:
            sal, created = SalaryStructure.objects.get_or_create(employee=instance, defaults={'base_salary':0})
            print(f"[DEBUG_UPDATE] {'Created' if created else 'Found'} SalaryStructure. Updating fields: {list(salary_data.keys())}")
            for attr, value in salary_data.items():
                setattr(sal, attr, value)
            sal.save()
            print(f"[DEBUG_UPDATE] SalaryStructure saved. Base: {sal.base_salary}, Bonus: {sal.bonus}")
            
        if leave_data is not None:
            lr, _ = LeaveRecord.objects.get_or_create(employee=instance)
            for attr, value in leave_data.items():
                setattr(lr, attr, value)
            lr.save()
            
        return instance
