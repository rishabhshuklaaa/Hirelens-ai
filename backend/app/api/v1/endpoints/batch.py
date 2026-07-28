import os
import uuid
import json
import asyncio
import magic
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job_context import JobContext
from app.models.batch import Batch
from app.models.resume import Resume, ResumeStatus
from app.schemas.batch import BatchUploadResponse
from app.services.gatekeeper import process_batch
from app.services.queue_manager import get_queue
from app.core.database import SessionLocal 

router = APIRouter(prefix="/batch", tags=["Batch & Resumes"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=BatchUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_resumes(
    background_tasks: BackgroundTasks,
    job_context_id: int = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(files) < 1 or len(files) > 10:
        raise HTTPException(status_code=400, detail="Please upload between 1 and 10 PDFs.")
    
    # job_context = db.query(JobContext).filter(JobContext.user_id == current_user.id).first()
    # if not job_context:
    #     raise HTTPException(status_code=400, detail="Please set a Job Context before uploading resumes.")

    job_context = db.query(JobContext).filter(
        JobContext.id == job_context_id, 
        JobContext.user_id == current_user.id
    ).first()
    
    if not job_context:
        raise HTTPException(status_code=404, detail="Selected Job Context not found.")
    # PASS 1: Validate all files
    validated_files = []
    for file in files:
        file_contents = await file.read()
        mime = magic.from_buffer(file_contents, mime=True)
        if mime != "application/pdf":
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' is not a valid PDF.")
        validated_files.append({"filename": file.filename, "contents": file_contents})
        
    # PASS 2: Save to DB and Disk
    new_batch = Batch(
        user_id=current_user.id,
        job_context_id=job_context.id,
        total_files=len(validated_files),
        status="processing"
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    
    saved_resumes = []
    for v_file in validated_files:
        safe_filename = f"{uuid.uuid4().hex}.pdf"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(file_path, "wb") as f:
            f.write(v_file["contents"])
            
        new_resume = Resume(
            batch_id=new_batch.id,
            user_id=current_user.id,
            original_filename=v_file["filename"],
            file_path=file_path,
            file_size_bytes=len(v_file["contents"]),
            status=ResumeStatus.UPLOADED
        )
        db.add(new_resume)
        saved_resumes.append(new_resume)
        
    db.commit()
    
    # Trigger Background Gatekeeper Processing
    background_tasks.add_task(process_batch, new_batch.id)
    
    return BatchUploadResponse(
        batch_id=new_batch.id,
        total_files=len(saved_resumes),
        message="Batch uploaded successfully. Processing started."
    )



@router.get("/{batch_id}/progress")
async def stream_batch_progress(
    batch_id: int,
    current_user: User = Depends(get_current_user)
):
    """SSE Endpoint to stream live progress of batch processing."""
    
    # Initial check using a temporary session
    db = SessionLocal()
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.user_id == current_user.id).first()
    is_completed = batch.status == "completed" if batch else False
    db.close() # Close immediately, we don't need it holding a connection
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    if is_completed:
        async def quick_done():
            yield f"data: {json.dumps({'status': 'COMPLETED'})}\n\n"
        return StreamingResponse(quick_done(), media_type="text/event-stream")

    q = get_queue(batch_id)

    async def event_generator():
        while True:
            try:
                # Safe DB Check: Create a fresh session for each check to avoid DetachedInstanceError
                db_check = SessionLocal()
                fresh_batch = db_check.query(Batch).filter(Batch.id == batch_id).first()
                db_status = fresh_batch.status if fresh_batch else None
                db_check.close()
                
                # Double check DB status in case queue missed the DONE message
                if db_status == "completed":
                    yield f"data: {json.dumps({'status': 'COMPLETED'})}\n\n"
                    break
                    
                if not q.empty():
                    message = q.get_nowait()
                    if message == "DONE":
                        yield f"data: {json.dumps({'status': 'COMPLETED'})}\n\n"
                        break
                    elif message == "ERROR":
                        yield f"data: {json.dumps({'status': 'FAILED'})}\n\n"
                        break
                    else:
                        yield f"data: {message}\n\n"
                else:
                    await asyncio.sleep(0.1) # Prevent CPU spinning
            except Exception:
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")