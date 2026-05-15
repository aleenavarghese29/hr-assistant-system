import os
import json
from dotenv import load_dotenv
try:
    from groq import Groq
except ImportError:
    pass

load_dotenv()

class LLMService:
    @staticmethod
    def _flatten(obj, prefix='', depth=0, max_depth=4) -> str:
        """Recursively flatten a dict/list into readable key:value lines."""
        lines = []
        if depth > max_depth:
            return ''
        if isinstance(obj, dict):
            for k, v in obj.items():
                full_key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, (dict, list)):
                    lines.append(LLMService._flatten(v, full_key, depth+1, max_depth))
                else:
                    lines.append(f"  {full_key}: {v}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj[:12]):  # Cap list display to 12 (e.g., full year of salaries)
                lines.append(LLMService._flatten(item, f"{prefix}[{i}]", depth+1, max_depth))
        else:
            lines.append(f"  {prefix}: {obj}")
        return '\n'.join(lines)

    @staticmethod
    def generate_response(payload: dict) -> dict:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment.")
            
        client = Groq(api_key=api_key)
        
        system_prompt = """You are a knowledgeable, empathetic AI HR Assistant.

RULES:
1. Answer ONLY the single specific question asked. Do NOT add any extra information that was not asked for.
2. CRITICAL: NEVER invent, assume, or use general knowledge. Use ONLY facts explicitly present in the provided context data.
3. If the topic asked about is NOT in the provided data, say: "I don't have that information in our system. Please contact HR directly." Do NOT guess or infer.
4. COMPUTED DATA is the source of truth. If it contains a 'SALARY_BREAKDOWN' for a month, that IS the answer.
5. For SALARY_BREAKDOWN, the 'abstracted_data' MUST include all sub-components like HRA, Tax, PF, and Transport from the COMPUTED DATA to ensure the salary slip can be generated.
6. POLICY DISCOVERY: Leave information can be found in multiple policies. Check EVERY policy block provided in COMPANY POLICIES.
7. STRICT FOCUS: One answer per question. Do NOT volunteer holiday dates, leave balances, or any unrelated detail unless specifically asked.

Output: Valid JSON with exactly:
- "answer": 1-2 sentence direct answer to the specific question only. Use values from COMPUTED DATA if present.
- "explanation": 2-4 sentence warm plain-English context about the same topic only.
- "abstracted_data": dict with relevant key:value pairs (including all salary components for payroll queries) pulled directly from the data, or null.
"""
        
        query = payload.get('query', '')
        
        # Build context sections
        sections = []
        
        # 1. Employee profile
        emp = payload.get('employee_context') or {}
        if emp:
            emp_text = (
                f"EMPLOYEE PROFILE:\n"
                f"  Name: {emp.get('name')} | ID: {emp.get('employee_id')}\n"
                f"  Job Title: {emp.get('job_title')} | Department: {emp.get('department')}\n"
                f"  Employment Type: {emp.get('employment_type')} | Status: {emp.get('work_status')}\n"
                f"  Joining: {emp.get('date_of_joining')} | Probation End: {emp.get('probation_end_date')}\n"
            )
            lh_sum = emp.get('leave_history_summary', [])
            if lh_sum:
                emp_text += "  Recent Leaves:\n"
                for h in lh_sum:
                    emp_text += f"    - {h.get('type')} | {h.get('dates')} | {h.get('days')} d | {h.get('status')}\n"
            lr = emp.get('leave_records', {})
            if lr:
                for lt, ld in lr.get('leave_balances', {}).items():
                    emp_text += f"  {lt} Balance: {ld.get('total') - ld.get('used') - ld.get('pending')} / {ld.get('total')}\n"
            sal = emp.get('salary_structure', {})
            if sal:
                emp_text += f"  Base Salary: {sal.get('base_salary')} {sal.get('currency')} | Bonus: {sal.get('bonus')}\n"
            sections.append(emp_text)

        # 2. Computed data
        comp = payload.get('computed_data')
        if comp:
            sections.append(f"COMPUTED DATA:\n{LLMService._flatten(comp)}")

        # 3. Aggregated Policies (Larger context cap: 6000 chars)
        policies = payload.get('all_policies', []) or []
        if policies:
            pol_text = "COMPANY POLICIES (Scan carefully for topic matches):\n"
            for p in policies:
                pol_section = f"\n[{p.get('policy_name','').upper()}]:\n{LLMService._flatten(p.get('rules', {}))}\n"
                if len(pol_text) + len(pol_section) < 6000:
                    pol_text += pol_section
                else: break
            sections.append(pol_text)

        # 4. Explicit Leave Type Discovery from ALL Policies
        all_types = {}
        for p in policies:
            rules = p.get('rules', {})
            # Check rules.types
            types_map = rules.get('types', {})
            if isinstance(types_map, dict):
                for k, v in types_map.items():
                    all_types[k] = v
            # Check top-level rules for keys ending in "Leave" or known types
            for k, v in rules.items():
                if k != 'types' and (k.lower().endswith('leave') or k.upper() in ['WFH', 'LWP', 'EARNED', 'COMPENSATORY_OFF']):
                    all_types[k] = v
        
        if all_types:
            type_lines = []
            for lt, details in all_types.items():
                desc = "defined in policy"
                if isinstance(details, dict):
                    val = details.get('max_per_year') or details.get('max_days') or details.get('entitlement') or details.get('days')
                    if val: desc = f"{val} days/year"
                type_lines.append(f"  - {lt}: {desc}")
            sections.append("ALL RECOGNIZED LEAVE TYPES (aggregated from all policies):\n" + "\n".join(type_lines))

        # 4. Holidays (compact list)
        holidays = payload.get('company_holidays', []) or []
        if holidays:
            hol_text = "COMPANY HOLIDAYS:\n" + '\n'.join(
                f"  {h['date']} | {h['name']} | {h['type']}" for h in holidays[:20]
            )
            sections.append(hol_text)

        # 5. Attachment Content (RAG)
        if payload.get('attachment_content'):
            sections.append(f"UPLOADED ATTACHMENT CONTENT (Analyze this for relevance/validation):\n{payload.get('attachment_content')}")

        today_date = payload.get('today_date', '')
        context_text = '\n\n'.join(sections)
        user_prompt = f"TODAY'S DATE: {today_date}\n\nUSER QUESTION: {query}\n\n{context_text}\n\nAnswer the user's question directly. If 'COMPUTED DATA' contains an action result (like a leave submission), acknowledge and confirm it as the primary answer."
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(completion.choices[0].message.content)
        except Exception:
            raise ValueError("Failed to parse LLM JSON syntax.")

    @staticmethod
    def analyze_attachment(file) -> str:
        """Extracts text or analyzes image content from an uploaded file."""
        if not file:
            return ""
            
        file_ext = file.name.lower().split('.')[-1]
        content = f"--- ATTACHMENT: {file.name} ---\n"
        
        try:
            if file_ext == "docx":
                import docx
                doc = docx.Document(file)
                content += "\n".join([p.text for p in doc.paragraphs])
            elif file_ext == "pdf":
                import PyPDF2
                pdf = PyPDF2.PdfReader(file)
                for page in pdf.pages:
                    content += page.extract_text() + "\n"
            elif file_ext in ["jpg", "jpeg", "png"]:
                # Multimodal analysis via Groq (Llama 3.2 Vision)
                import base64
                api_key = os.getenv("GROQ_API_KEY")
                if api_key:
                    from groq import Groq
                    client = Groq(api_key=api_key)
                    image_base64 = base64.b64encode(file.read()).decode('utf-8')
                    completion = client.chat.completions.create(
                        model="llama-3.2-90b-vision-preview",
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": "Describe this HR-related document or image in detail. Extract any relevant text, names, dates, or values (like medical reasons or salary figures)."},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/{file_ext};base64,{image_base64}",
                                        },
                                    },
                                ],
                            }
                        ],
                    )
                    content += f"[IMAGE ANALYSIS]: {completion.choices[0].message.content}"
                else:
                    content += "[ERROR]: Groq API Key missing for vision analysis."
            else:
                # Assume text-based for others
                content += file.read().decode('utf-8', errors='ignore')
        except Exception as e:
            content += f"[EXTRACTION FAILED]: {str(e)}"
            
        return content

    @staticmethod
    def extract_leave_parameters(query: str, today_date: str) -> dict:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return {}
            
        client = Groq(api_key=api_key)
        
        system_prompt = f"""
        You are a deterministic entity extractor for an HR system. Given a user's request for leave, extract specific parameters into JSON.
        
        TODAY'S DATE: {today_date}
        
        EXTRACT:
        - reasoning: Brief step-by-step logic on how you calculated the dates (e.g., "Today is Fri 17, next Mon is 17+3=20")
        - leave_type: One of [SICK, CASUAL, WFH, RH, LWP, EARNED, BEREAVEMENT, WEDDING, MATERNITY, PATERNITY]
        - from_date: YYYY-MM-DD
        - to_date: YYYY-MM-DD (Same as from_date if single day)
        - reason: Brief string or null
        
        CRITICAL DATE RESOLUTION RULES:
        1. Parse relative phrases (today, tomorrow, next week, next monday) based STRICTLY on {today_date}.
        2. "next [Weekday]" always refers to the upcoming occurrence of that day after today.
        3. If no year is specified, assume 2026.
        
        Output ONLY valid JSON.
        """
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(completion.choices[0].message.content)
        except Exception:
            return {}

    @staticmethod
    def extract_policies_from_text(raw_text: str) -> list:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment.")
            
        client = Groq(api_key=api_key)
        
        system_prompt = """
        You are an elite, deterministic logic extractor mapping unstructured textual documents into explicitly defined JSON rule graphs.
        You must evaluate the document and extract explicit rules corresponding to any of these exact predefined policy names:
        - attendance_policy
        - code_of_conduct_policy
        - resignation_and_notice_period_policy
        - remote_work_policy
        - general_leave_policy
        - payroll_policy
        - working_hours_and_holidays_policy
        
        If a policy type is not mentioned or contains no structured rules, omit it entirely.
        
        You MUST return a JSON object with a single key "policies", which contains an array of extracted policies.
        Format example:
        {
          "policies": [
            {
               "policy_name": "remote_work_policy",
               "rules": {
                   "max_continuous_wfh_days": 3,
                   "types": {"WFH": {"allowed": true}}
               }
            }
          ]
        }
        
        Return ONLY valid JSON. If the document is garbled, OCR failed, or it contains no policies, return {"policies": []}.
        """
        
        user_prompt = f"Extract policies from the following text:\n\n{raw_text[:15000]}"
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        try:
            resp = json.loads(completion.choices[0].message.content)
            return resp.get("policies", [])
        except Exception:
            return []
