from typing import Dict, Any
from hr_engine.types import Intent
class ContextManager:
    # Memory store for sessions. Production systems use redis or db.
    _sessions: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_context(cls, session_id: str) -> Dict[str, Any]:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = {
                "last_intent": None,
                "last_sub_intent": None,
                "extracted_entities": {},
                "accessed_domains": set()
            }
        return cls._sessions[session_id]

    @classmethod
    def update_context(cls, session_id: str, updates: Dict[str, Any]):
        session = cls.get_context(session_id)
        
        if updates.get("intent") and updates["intent"] != Intent.UNKNOWN:
            session["last_intent"] = updates["intent"]
            session["accessed_domains"].add(updates["intent"])
        if updates.get("sub_intent"):
            session["last_sub_intent"] = updates["sub_intent"]
        if updates.get("entities"):
            session["extracted_entities"].update(updates["entities"])
            
        return session
