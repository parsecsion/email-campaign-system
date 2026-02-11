import os
import json
import logging
from datetime import datetime
from openai import OpenAI
from agent.tools import AgentTools

logger = logging.getLogger(__name__)

# Initialize OpenAI client (supports OpenRouter)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

SYSTEM_PROMPT = """
You are the AI Commander for the Email Campaign System.
You have direct access to the database and system tools.
Your goal is to help the user manage candidates, interviews, and emails.

## CAPABILITIES
- Manage Candidates: Search, Add, Delete, Update.
- Manage Schedule: Check availability, Book interviews.
- Manage Emails: Draft, Send.

## RULES
1. **Be Precise**: Use the provided tools. Do not hallucinate data.
2. **Be Concise**: Keep responses short and professional.
3. **Safety**: If a user asks to delete something, verify the name/ID first.

## OUTPUT FORMAT
You are a function-calling agent. 
If you need to use a tool, output a tool call. 
If you can answer directly, output text.
"""

class AgentService:
    def __init__(self):
        self.tools = AgentTools()
        self.available_functions = {
            "search_candidates": self.tools.search_candidates,
            "add_candidate": self.tools.add_candidate,
            "get_schedule": self.tools.get_schedule,
            "check_availability": self.tools.check_availability,
            "schedule_interview": self.tools.schedule_interview,
            "delete_interview": self.tools.delete_interview,
            "draft_email": self.tools.draft_email,
            "get_candidate_details": self.tools.get_candidate_details,
            "update_candidate": self.tools.update_candidate
        }
    
    
    def process_message(self, message_history, model=None, user_email=None):
        """
        Process a user message using the agent loop.
        1. Formulate system prompt
        2. Append user history
        3. Define tools
        4. Call LLM
        5. Execute tool (if any)
        6. Return final response
        """
        try:
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            dynamic_system_prompt = f"{SYSTEM_PROMPT}\nCurrent Time: {current_time}"
            
            messages = [{"role": "system", "content": dynamic_system_prompt}] + message_history

            # Tool Definitions
            tool_definitions = [
                {
                    "type": "function",
                    "function": {
                        "name": "search_candidates",
                        "description": "Search for candidates by name, email, or country.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "General search term (optional if specific fields are used)"},
                                "first_name": {"type": "string", "description": "First name of the candidate"},
                                "last_name": {"type": "string", "description": "Last name of the candidate"},
                                "email": {"type": "string", "description": "Email address"},
                                "phone": {"type": "string", "description": "Phone number"},
                                "country": {"type": "string", "description": "Optional country filter (e.g. 'US', 'UK')"}
                            },
                            "required": []
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_candidate_details",
                        "description": "Get detailed information about a specific candidate by ID.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "candidate_id": {"type": "integer", "description": "The ID of the candidate"}
                            },
                            "required": ["candidate_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "add_candidate",
                        "description": "Add a new candidate to the database.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "first_name": {"type": "string"},
                                "last_name": {"type": "string"},
                                "email": {"type": "string"},
                                "country": {"type": "string", "description": "e.g. 'US' or 'UK'"}
                            },
                            "required": ["first_name", "last_name", "email"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "update_candidate",
                        "description": "Update candidate details (email, phone, status, notes, etc).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "candidate_id": {"type": "integer", "description": "ID of the candidate to update"},
                                "first_name": {"type": "string"},
                                "last_name": {"type": "string"},
                                "email": {"type": "string"},
                                "phone": {"type": "string"},
                                "country": {"type": "string"},
                                "notes": {"type": "string"},
                                "status": {"type": "string"}
                            },
                            "required": ["candidate_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "check_availability",
                        "description": "Check available interview slots for a date range.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "start_date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
                                "end_date": {"type": "string", "description": "ISO date YYYY-MM-DD"}
                            },
                            "required": ["start_date", "end_date"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "schedule_interview",
                        "description": "Schedule an interview for a candidate.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "candidate_id": {"type": "integer"},
                                "interview_date": {"type": "string", "description": "ISO datetime YYYY-MM-DDTHH:MM:SS"}
                            },
                            "required": ["candidate_id", "interview_date"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "delete_interview",
                        "description": "Delete (cancel) an interview.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "interview_id": {"type": "integer"}
                            },
                            "required": ["interview_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_schedule",
                        "description": "Get upcoming interviews.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "integer", "description": "Number of interviews to fetch"}
                            }
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "draft_email",
                        "description": "Draft an email to a candidate (saved to Drafts).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "recipient_email": {"type": "string"},
                                "subject": {"type": "string"},
                                "content": {"type": "string", "description": "HTML content of the email"}
                            },
                            "required": ["recipient_email", "subject", "content"]
                        }
                    }
                }
            ]

            # 4. Call LLM
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tool_definitions,
                tool_choice="auto"
            )

            response_message = completion.choices[0].message
            meta_data = {
                "tool_outputs": [],
                "confirmation_request": None
            }

            if response_message.tool_calls:
                # Check for sensitive tools (Confirmation Interceptor)
                # First, check if the user just confirmed this action
                last_user_msg = message_history[-1].get('content', '') if message_history else ''
                normalized_msg = last_user_msg.strip().upper()

                # Treat only explicit structured confirmations from the UI as valid.
                is_confirmed = False
                if normalized_msg.startswith("CONFIRMED:"):
                    is_confirmed = True
                elif normalized_msg in ["PROCEED", "YES", "CONFIRM", "GO AHEAD", "DO IT", "SURE", "OK", "OKAY"]:
                    is_confirmed = True
                # Check for "Yes, ..." patterns
                elif normalized_msg.startswith("YES,") or normalized_msg.startswith("YES "):
                    is_confirmed = True

                for tool_call in response_message.tool_calls:
                    fn_name = tool_call.function.name
                    if fn_name in ["add_candidate", "delete_interview", "schedule_interview", "update_candidate"]:
                        # If confirmed, skip the interceptor
                        if is_confirmed:
                            logger.info(f"Sensitive tool {fn_name} allow-listed by user confirmation: '{last_user_msg}'")
                            continue

                        # Pause execution and return confirmation request
                        logger.info(f"Sensitive tool {fn_name} called. Requesting confirmation.")

                        meta_data["confirmation_request"] = {
                            "tool": fn_name,
                            "args": json.loads(tool_call.function.arguments),
                            "message": f"I need to {fn_name.replace('_',' ')}: {tool_call.function.arguments}"
                        }
                        return {
                            "content": f"I need your permission to execute {fn_name}.",
                            "meta": meta_data
                        }

                messages.append(response_message)
                
                for tool_call in response_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    if function_name in self.available_functions:
                        function_to_call = self.available_functions[function_name]
                        
                        # Special handling for tools that need user context
                        if function_name == "draft_email" and user_email:
                            function_args["sender_email"] = user_email
                        
                        try:
                            tool_output = function_to_call(**function_args)
                        except TypeError as e:
                            # Fallback if arguments don't match (e.g. sender_email not expected yet)
                            logger.warning(f"Tool call argument mismatch: {e}")
                            tool_output = function_to_call(**json.loads(tool_call.function.arguments))

                        # Add to meta for rich UI
                        meta_data["tool_outputs"].append({
                            "tool": function_name,
                            "output": tool_output
                        })
                        
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(tool_output)
                        })
                    else:
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps({"error": f"Function {function_name} not found"})
                        })
                
                # 6. Second Call to LLM (for final response)
                final_response = client.chat.completions.create(
                    model=model,
                    messages=messages
                )
                return {
                    "content": final_response.choices[0].message.content,
                    "meta": meta_data
                }
            
            return {
                "content": response_message.content,
                "meta": meta_data
            }

        except Exception as e:
            logger.error(f"Agent logic error: {str(e)}")
            return {
                "content": f"Error: {str(e)}",
                "meta": {}
            }
