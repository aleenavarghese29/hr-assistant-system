import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from hr_engine.models import Policy
defaults = [
    {'name': 'attendance_policy', 'description': 'Rules governing expected work hours and attendance.', 'rules': {'types': {}, 'constraints': {}}},
    {'name': 'code_of_conduct_policy', 'description': 'Behavioral expectations and organizational culture guidelines.', 'rules': {'types': {'disciplinary_actions': True}, 'constraints': {}}},
    {'name': 'resignation_and_notice_period_policy', 'description': 'Parameters governing structured offboarding and exit logic.', 'rules': {'types': {}, 'constraints': {'notice_period_days': 30}}},
    {'name': 'remote_work_policy', 'description': 'Calculations and constraints for hybrid/WFH scheduling.', 'rules': {'types': {}, 'constraints': {'max_continuous_wfh_days': 3}}}
]
for p in defaults:
    if not Policy.objects.filter(policy_name=p['name']).exists():
        Policy.objects.create(policy_name=p['name'], description=p['description'], rules=p['rules'])

print("Seeding complete.")
