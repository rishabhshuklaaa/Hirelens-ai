import logging
from langchain_groq import ChatGroq
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings
from app.schemas.email import EmailContent
from app.ai.prompts.email_prompt import build_system_prompt

logger = logging.getLogger(__name__)


def generate_email_content(email_type: str, candidate_name: str, job_title: str, company_name: str, strong_points: list, missing_skills: list) -> EmailContent:
    """Calls LLM to generate email subject and body."""
    
    # FIX: Using llama-3.1-8b-instant for stability and consistency
    llm = ChatGroq(
        temperature=0.2, 
        groq_api_key=settings.GROQ_API_KEY,
        model_name="llama-3.1-8b-instant",
        timeout=30,
        max_retries=1
    )
    
    parser = PydanticOutputParser(pydantic_object=EmailContent)
    
    # Build system prompt as plain string
    system_text = build_system_prompt(email_type, candidate_name, job_title, company_name, strong_points, missing_skills)
    
    # FIX: Append format instructions directly to the string (avoids template brace crashes)
    system_text += "\n\n" + parser.get_format_instructions()
    
    try:
        response = llm.invoke([
            SystemMessage(content=system_text),
            HumanMessage(content=f"Please draft the {email_type} email for {candidate_name}."),
        ])
        return parser.parse(response.content)
    except Exception as e:
        logger.error(f"Failed to generate email: {str(e)}")
        raise Exception("AI failed to generate email draft. Please try manually.")