import os
import re
import hashlib
import fitz  # PyMuPDF
import json
import logging
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.database import SessionLocal
from app.models.batch import Batch
from app.models.resume import Resume, ResumeStatus
from app.models.job_context import JobContext
from app.services.queue_manager import get_queue

logger = logging.getLogger(__name__)

# Regex for email extraction
# Added word boundary (\b) at the start to prevent capturing leading dashes or special chars
EMAIL_REGEX = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'

def clean_text(text: str) -> str:
    """Clean extracted text by removing extra spaces and special chars."""
    text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces
    text = re.sub(r'[^\x00-\x7F]+', ' ', text) # Remove non-ASCII characters
    return text.strip()

def compute_tfidf_score(jd_text: str, resume_text: str) -> float:
    """Compute cosine similarity between JD and Resume using TF-IDF."""
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
        # Cosine similarity between JD (0) and Resume (1)
        score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(float(score) * 100, 2)  # Return as percentage
    except ValueError:
        return 0.0

def process_batch(batch_id: int):
    """Main background task to process all resumes in a batch."""
    db: Session = SessionLocal()
    q = get_queue(batch_id)
    
    try:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return
            
        job_context = db.query(JobContext).filter(JobContext.id == batch.job_context_id).first()
        jd_text = job_context.jd_text if job_context else ""
        
        resumes = db.query(Resume).filter(Resume.batch_id == batch_id).all()
        
        for resume in resumes:
            # Push initial status
            q.put(json.dumps({"resume_id": resume.id, "filename": resume.original_filename, "status": "Processing..."}))
            
            try:
                # 1. Read File & Compute Hash
                with open(resume.file_path, "rb") as f:
                    file_contents = f.read()
                content_hash = hashlib.sha256(file_contents).hexdigest()
                
                # Check for duplicates
                existing = db.query(Resume).filter(Resume.content_hash == content_hash, Resume.id != resume.id).first()
                if existing:
                    resume.status = ResumeStatus.DUPLICATE_SKIPPED
                    resume.content_hash = content_hash
                    db.commit()
                    q.put(json.dumps({"resume_id": resume.id, "filename": resume.original_filename, "status": resume.status.value, "reason": "Duplicate file"}))
                    continue
                    
                resume.content_hash = content_hash
                
                # 2. Extract Text & Page Count
                doc = fitz.open(resume.file_path)
                resume.page_count = doc.page_count
                extracted_text = "".join(page.get_text() for page in doc)
                doc.close()
                
                # 3. Unreadable Check (No text found, likely scanned PDF)
                if not extracted_text.strip():
                    resume.status = ResumeStatus.UNREADABLE
                    resume.unreadable_reason = "No text found (scanned or corrupt PDF)"
                    db.commit()
                    q.put(json.dumps({"resume_id": resume.id, "filename": resume.original_filename, "status": resume.status.value, "reason": resume.unreadable_reason}))
                    continue
                    
                resume.extracted_text = extracted_text
                resume.cleaned_text = clean_text(extracted_text)
                
                # 4. Extract Email
                email_match = re.search(EMAIL_REGEX, extracted_text)
                if email_match:
                    resume.candidate_email = email_match.group(0)
                    
                # 5. Quick ATS Score
                resume.quick_score = compute_tfidf_score(jd_text, resume.cleaned_text)
                
                # 6. Route based on Page Count (Size > 5MB is ignored as per rules)
                if resume.page_count == 1:
                    resume.status = ResumeStatus.AUTO_ADDED
                else:
                    resume.status = ResumeStatus.NEEDS_REVIEW
                    
                db.commit()
                q.put(json.dumps({
                    "resume_id": resume.id, 
                    "filename": resume.original_filename, 
                    "status": resume.status.value, 
                    "score": resume.quick_score,
                    "email": resume.candidate_email
                }))
                
            except Exception as e:
                logger.error(f"Error processing resume {resume.id}: {str(e)}")
                resume.status = ResumeStatus.UNREADABLE
                resume.unreadable_reason = f"Processing error: {str(e)}"
                db.commit()
                q.put(json.dumps({"resume_id": resume.id, "filename": resume.original_filename, "status": resume.status.value, "reason": resume.unreadable_reason}))
                
        # Mark batch as completed
        batch.status = "completed"
        db.commit()
        q.put("DONE") # Signal SSE endpoint to close connection
        
    except Exception as e:
        logger.error(f"Batch processing failed: {str(e)}")
        q.put("ERROR")
    finally:
        db.close()
        # NOTE: remove_queue(batch_id) is intentionally omitted here to prevent 
        # race conditions where the SSE client connects after the queue is deleted.
        # The queue manager will handle cleanup or rely on the DB status check in SSE.