from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from hr_engine.types import UserRequest
from hr_engine.core.Orchestrator import Orchestrator

class ChatAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        data = request.data
        user_req = UserRequest(
            employee_id=data.get("employee_id", "E1001"),
            organization_id=data.get("organization_id", "ORG_1"),
            query_text=data.get("query_text", ""),
            session_id=data.get("session_id"),
            attachment=request.FILES.get("attachment")
        )
        try:
            print(f"\n[API ENTRY] Processing query for {user_req.employee_id} (Session: {user_req.session_id})")
            response = Orchestrator.process_request(user_req)
            return Response({"status": "success", "data": response})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

from rest_framework import viewsets
from .models import Employee, SalaryStructure, SalaryRecord, LeaveRecord, Document, Policy, LeaveHistory, CompanyBranding, CompanyHoliday
from .serializers import EmployeeSerializer, SalaryStructureSerializer, SalaryRecordSerializer, LeaveRecordSerializer, DocumentSerializer, PolicySerializer, LeaveHistorySerializer, CompanyBrandingSerializer, CompanyHolidaySerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    from rest_framework.decorators import action
    @action(detail=True, methods=['post'])
    def archive_salary(self, request, pk=None):
        employee = self.get_object()
        month = request.data.get('month')
        if not month:
            return Response({"error": "Month is required (YYYY-MM)"}, status=400)
        
        try:
            # Optionally update salary structure if provided in request
            provided_ss = request.data.get('salary_structure')
            if provided_ss:
                ss_obj, _ = SalaryStructure.objects.get_or_create(employee=employee, defaults={'base_salary': 0})
                for attr, value in provided_ss.items():
                    if attr != 'employee':
                        setattr(ss_obj, attr, value)
                ss_obj.save()
                employee.refresh_from_db()

            if not hasattr(employee, 'salary_structure'):
                return Response({"error": "Salary structure not defined for this employee. Please set Base Salary first."}, status=400)
                
            ss = employee.salary_structure
            # Calculate net
            total_earnings = ss.base_salary + ss.bonus + sum(float(v) for v in ss.allowances.values())
            total_deductions = sum(float(v) for v in ss.deductions.values())
            net_salary = total_earnings - total_deductions
            
            record, created = SalaryRecord.objects.update_or_create(
                employee=employee,
                month=month,
                defaults={
                    'earnings': {**ss.allowances, 'base_salary': ss.base_salary, 'bonus': ss.bonus},
                    'deductions': ss.deductions,
                    'net_salary': net_salary,
                    'lwp_days': 0,
                    'base_daily_rate': ss.base_salary / 30.0
                }
            )
            return Response({"status": "success", "message": f"Archived salary for {month}", "data": SalaryRecordSerializer(record).data})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.all()
    serializer_class = SalaryStructureSerializer

class SalaryRecordViewSet(viewsets.ModelViewSet):
    queryset = SalaryRecord.objects.all()
    serializer_class = SalaryRecordSerializer

class LeaveRecordViewSet(viewsets.ModelViewSet):
    queryset = LeaveRecord.objects.all()
    serializer_class = LeaveRecordSerializer

class LeaveHistoryViewSet(viewsets.ModelViewSet):
    queryset = LeaveHistory.objects.all()
    serializer_class = LeaveHistorySerializer

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

class PolicyViewSet(viewsets.ModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer

class CompanyBrandingViewSet(viewsets.ModelViewSet):
    queryset = CompanyBranding.objects.all()
    serializer_class = CompanyBrandingSerializer

class CompanyHolidayViewSet(viewsets.ModelViewSet):
    queryset = CompanyHoliday.objects.all().order_by('date')
    serializer_class = CompanyHolidaySerializer

from django.core.cache import cache
import json
import time
from django.contrib.auth import authenticate, login
from rest_framework import status

class LoginAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(username=email, password=password)
        if user:
            # Check if user has an associated Employee profile
            try:
                employee = Employee.objects.get(user=user)
                return Response({
                    "status": "success",
                    "role": "ADMIN" if user.is_staff else "EMPLOYEE",
                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "email": user.email
                }, status=status.HTTP_200_OK)
            except Employee.DoesNotExist:
                # If admin, they might not have an Employee profile
                if user.is_staff:
                    return Response({
                        "status": "success",
                        "role": "ADMIN",
                        "name": user.username,
                        "email": user.email
                    }, status=status.HTTP_200_OK)
                return Response({"status": "error", "message": "User exists but no profile found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"status": "error", "message": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

class ChangePasswordAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        user = authenticate(username=email, password=old_password)
        if user:
            user.set_password(new_password)
            user.save()
            return Response({"status": "success", "message": "Password updated successfully."}, status=status.HTTP_200_OK)
        
        return Response({"status": "error", "message": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

class PolicyUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file = request.data.get('file')
        if not file:
            return Response({"status": "error", "message": "No file uploaded"}, status=400)
        # Edge Case 3: Read content explicitly via parsers
        file_ext = file.name.lower().split('.')[-1]
        content = ""
        try:
            if file_ext == "docx":
                import docx
                doc = docx.Document(file)
                content = "\n".join([p.text for p in doc.paragraphs])
            elif file_ext == "pdf":
                import PyPDF2
                pdf = PyPDF2.PdfReader(file)
                for page in pdf.pages:
                    content += page.extract_text() + "\n"
            else:
                content = file.read().decode('utf-8', errors='ignore')
        except Exception as e:
            cache.set('rag_processing', False, timeout=600)
            return Response({"status": "error", "message": f"Document extraction failed: {str(e)}"}, status=422)

        if len(content.strip()) < 10:
            cache.set('rag_processing', False, timeout=600)
            return Response({"status": "error", "message": "Document empty or unreadable binary format."}, status=422)

        from hr_engine.modules.LLMService import LLMService
        try:
            policies = LLMService.extract_policies_from_text(content)
        except Exception as e:
            cache.set('rag_processing', False, timeout=600)
            return Response({"status": "error", "message": f"LLM Mapping Exception: {str(e)}"}, status=500)

        # Edge Case 1: Unidentified concepts or missing data
        if not policies or len(policies) == 0:
            cache.set('rag_processing', False, timeout=600)
            return Response({"status": "error", "message": "No recognizable HR policies found mapped against standard logic constraints."}, status=422)

        assimilated = []
        for pol_data in policies:
            policy_name = pol_data.get('policy_name')
            generated_rules = pol_data.get('rules')
            
            if not policy_name or not generated_rules:
                continue
                
            assimilated.append(policy_name)
            # Edge Case 2: Clashing updates -> Direct overriding mappings.
            if Policy.objects.filter(policy_name=policy_name).exists():
                 pol = Policy.objects.get(policy_name=policy_name)
                 pol.rules = generated_rules
                 pol.save()
            else:
                 Policy.objects.create(
                     policy_name=policy_name,
                     description=f"Generated via LLM RAG mapped from {file.name}",
                     rules=generated_rules
                 )

        cache.set('rag_processing', False, timeout=600)
        return Response({"status": "success", "message": f"Successfully assimilated JSON structures for: {', '.join(assimilated)}"})

class ChatStatusView(APIView):
    def get(self, request):
        is_processing = cache.get('rag_processing', False)
        return Response({"is_processing": is_processing})

from .models import CompanyHoliday

class CalendarAPIView(APIView):
    def get(self, request):
        emp_id = request.query_params.get("employee_id")
        if not emp_id:
            return Response({"error": "employee_id parameter required"}, status=400)
            
        holidays = CompanyHoliday.objects.all().order_by('date')
        holiday_list = [{"date": str(h.date), "name": h.name, "type": h.type} for h in holidays]
        
        leaves = LeaveHistory.objects.filter(employee_id=emp_id).order_by('from_date')
        leave_list = [{
            "id": l.id,
            "from_date": str(l.from_date),
            "to_date": str(l.to_date),
            "days": l.days,
            "leave_type": l.leave_type,
            "reason": l.reason,
            "status": l.status.upper()
        } for l in leaves]
        
        from hr_engine.modules.DataAccessLayer import DataAccessLayer
        balance_summary = DataAccessLayer.get_leave_balance(emp_id, emp_id)

        # Build available leave types from ALL policies
        available_leave_types = []
        seen_types = set()
        
        import re
        all_policies = Policy.objects.all()
        for p in all_policies:
            rules = p.rules or {}
            for key in ['types', 'leave_types']:
                t_map = rules.get(key, {})
                if not isinstance(t_map, dict): continue
                for lt_raw, details in t_map.items():
                    # Normalize: "Sick Leave (SL)" -> "Sick Leave", "SICK" -> "Sick Leave"
                    label = lt_raw.split('(')[0].split('/')[0].strip()
                    if label.upper() == 'SICK': label = 'Sick Leave'
                    elif label.upper() == 'CASUAL': label = 'Casual Leave'
                    elif label.upper() == 'WFH': label = 'Work From Home'
                    
                    # Normalize identifiers
                    type_id = label.upper().replace(' ', '_')
                    if type_id == 'WORK_FROM_HOME': type_id = 'WFH'
                    if type_id == 'SICK_LEAVE': type_id = 'SICK'
                    if type_id == 'CASUAL_LEAVE': type_id = 'CASUAL'
                    if type_id == 'EARNED_LEAVE': type_id = 'EARNED'
                    if type_id == 'UNPAID_LEAVE': type_id = 'LWP'
                    
                    if type_id in seen_types: continue
                    
                    max_days = None
                    if isinstance(details, dict):
                        entitlement = details.get('max_per_year') or details.get('max_days') or details.get('days') or details.get('entitlement')
                        if entitlement:
                            if isinstance(entitlement, (int, float)):
                                max_days = entitlement
                            elif isinstance(entitlement, str):
                                m = re.search(r'(\d+)', entitlement)
                                if m: max_days = int(m.group(1))
                    
                    available_leave_types.append({
                        "type": type_id,
                        "label": label,
                        "max_per_year": max_days
                    })
                    seen_types.add(type_id)

        # Ensure Fallbacks
        if 'SICK' not in seen_types:
             available_leave_types.append({"type": "SICK", "label": "Sick Leave", "max_per_year": 10})
        if 'CASUAL' not in seen_types:
             available_leave_types.append({"type": "CASUAL", "label": "Casual Leave", "max_per_year": 12})
        if 'WFH' not in seen_types:
            available_leave_types.append({"type": "WFH", "label": "Work From Home", "max_per_year": None})
        if 'EARNED' not in seen_types:
            available_leave_types.append({"type": "EARNED", "label": "Earned Leave", "max_per_year": 18})
        if 'LWP' not in seen_types:
            available_leave_types.append({"type": "LWP", "label": "Unpaid Leave", "max_per_year": None})

        
        return Response({
            "holidays": holiday_list,
            "leaves": leave_list,
            "balance": balance_summary,
            "available_leave_types": available_leave_types
        })

