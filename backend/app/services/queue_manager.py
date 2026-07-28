import queue
import logging

logger = logging.getLogger(__name__)

# In-memory dictionary to hold queues for active batches
# Using standard queue.Queue because BackgroundTasks run in a threadpool
_active_queues = {}

def get_queue(batch_id: int) -> queue.Queue:
    """Get or create a queue for a specific batch."""
    if batch_id not in _active_queues:
        _active_queues[batch_id] = queue.Queue()
    return _active_queues[batch_id]

def remove_queue(batch_id: int):
    """Clean up queue after batch processing is complete."""
    if batch_id in _active_queues:
        del _active_queues[batch_id]