import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from django.contrib.auth.models import User

if not User.objects.filter(username='admin@company.com').exists():
    User.objects.create_superuser('admin@company.com', 'admin@company.com', 'admin123')
    print("Admin user created.")
else:
    print("Admin user already exists.")
