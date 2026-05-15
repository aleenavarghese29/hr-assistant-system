from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChatAPIView, EmployeeViewSet, SalaryStructureViewSet, SalaryRecordViewSet, 
    LeaveRecordViewSet, DocumentViewSet, PolicyViewSet, PolicyUploadView, 
    ChatStatusView, LeaveHistoryViewSet, CompanyBrandingViewSet, CalendarAPIView, 
    CompanyHolidayViewSet, LoginAPIView, ChangePasswordAPIView
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'salary-structures', SalaryStructureViewSet)
router.register(r'salaries', SalaryRecordViewSet)
router.register(r'leaves', LeaveRecordViewSet)
router.register(r'leave-history', LeaveHistoryViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'policies', PolicyViewSet)
router.register(r'branding', CompanyBrandingViewSet)
router.register(r'holidays', CompanyHolidayViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('chat', ChatAPIView.as_view(), name='chat_api'),
    path('chat/status', ChatStatusView.as_view(), name='chat_status'),
    path('policies/upload', PolicyUploadView.as_view(), name='policy_upload'),
    path('calendar', CalendarAPIView.as_view(), name='calendar_api'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('change-password/', ChangePasswordAPIView.as_view(), name='change-password'),
]
