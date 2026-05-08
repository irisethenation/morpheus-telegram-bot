import json
import os
from datetime import datetime


class CommunicationLogger:
    def __init__(self):
        self.log_path = "/app/logs/comm_audit.json"
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def execute(self, payload):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "direction": payload.get("direction"),
            "from": payload.get("from_email"),
            "to": payload.get("to_email"),
            "subject": payload.get("subject"),
            "body": payload.get("body"),
            "thread_id": payload.get("thread_id"),
        }
        with open(self.log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
        return {"status": "success"}
