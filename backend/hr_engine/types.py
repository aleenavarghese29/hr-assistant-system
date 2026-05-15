from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

class Intent(str, Enum):
    PAYROLL_QUERY = 'PAYROLL_QUERY'
    LEAVE_QUERY = 'LEAVE_QUERY'
    POLICY_QUERY = 'POLICY_QUERY'
    DOCUMENT_REQUEST = 'DOCUMENT_REQUEST'
    ATTENDANCE_QUERY = 'ATTENDANCE_QUERY'
    PROFILE_QUERY = 'PROFILE_QUERY'
    GENERAL_QUERY = 'GENERAL_QUERY'
    UNKNOWN = 'UNKNOWN'

class SubIntent(str, Enum):
    VIEW = 'VIEW'
    EXPLAIN = 'EXPLAIN'
    COMPARE = 'COMPARE'
    ELIGIBILITY = 'ELIGIBILITY'
    SIMULATION = 'SIMULATION'
    APPLY = 'APPLY'
    UNKNOWN = 'UNKNOWN'

@dataclass
class UserRequest:
    employee_id: str
    organization_id: str
    query_text: str
    session_id: Optional[str] = None
    attachment: Optional[Any] = None # For uploaded files
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())

@dataclass
class PolicyReference:
    policy_name: str
    clause_reference: str

@dataclass
class BaseResponse:
    answer: str
    data: Optional[Dict[str, Any]]
    explanation: str
    policy_reference: Optional[str]
    next_steps: Optional[str]

@dataclass
class RequestContext:
    request: UserRequest
    session_id: Optional[str] = None
    intent: Optional[Intent] = None
    sub_intent: Optional[SubIntent] = None
    entities: Dict[str, Any] = field(default_factory=dict)
    permissions_valid: bool = False
    data_fetched: Any = None
    policy_approved: bool = False
    policy_reference: Optional[PolicyReference] = None
    computation_result: Any = None
    attachment_content: Optional[str] = None # Extracted text/metadata from file
    response: Optional[BaseResponse] = None
