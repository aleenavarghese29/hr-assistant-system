from typing import Dict, Any
import copy

class SecurityLayer:
    @staticmethod
    def validate_permissions(context: Any) -> bool:
        if not context.request.employee_id or not context.request.organization_id:
            raise Exception("Security Violation: Missing required identification fields (employee_id, organization_id).")
        
        context.permissions_valid = True
        return True

    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            return data
        
        cloned_data = copy.deepcopy(data)
        SecurityLayer._traverse_and_mask(cloned_data)
        return cloned_data

    @staticmethod
    def _traverse_and_mask(obj: Any):
        if not isinstance(obj, dict):
            return
        
        keys_to_delete = []
        for key, value in list(obj.items()):
            lower_key = str(key).lower()
            if any(k in lower_key for k in ['bank', 'ssn', 'id_number', 'account_number', 'routing']):
                obj[key] = '***MASKED***'
            elif 'hr_notes' in lower_key:
                keys_to_delete.append(key)
            elif isinstance(value, dict):
                SecurityLayer._traverse_and_mask(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        SecurityLayer._traverse_and_mask(item)
                        
        for key in keys_to_delete:
            del obj[key]
