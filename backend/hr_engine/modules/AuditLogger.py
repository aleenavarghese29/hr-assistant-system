import json
from datetime import datetime
from typing import Dict, Any

class AuditLogger:
    @staticmethod
    def log_request(params: Dict[str, Any]):
        log_entry = {
            "event_type": "HR_ASSISTANT_AUDIT",
            "employee_id": params.get("employee_id"),
            "intent": str(params.get("intent", "UNKNOWN")),
            "data_accessed": params.get("data_accessed", []),
            "response": params.get("response_summary"),
            "timestamp": datetime.fromtimestamp(params.get("timestamp", datetime.now().timestamp())).isoformat()
        }
        print(f"[AUDIT] {json.dumps(log_entry)}")
