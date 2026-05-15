import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from django.contrib.auth.models import User
from hr_engine.models import Employee

employees = Employee.objects.all()
for emp in employees:
    email = emp.professional_email
    if not email:
        continue
        
    user, created = User.objects.get_or_create(
        username=email,
        defaults={'email': email, 'is_staff': False}
    )
    
    if created:
        user.set_password('Welcome@123')
        user.save()
        print(f"Created user for {email}")
    
    if not emp.user:
        emp.user = user
        emp.save()
        print(f"Linked employee {emp.name} to user {email}")

print("Sync complete.")
