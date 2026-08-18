import os
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import mimetypes

from telecom_exact_tables import calculate_exact_telecom_tables
from telecom_analytics import analyze_dataset
from telecom_rag import generate_telecom_digest, create_rno_prompt
from llm_client import (
    call_groq_api,
    call_gemini_free_api,
    call_ollama_local,
    generate_deterministic_expert_report
)

PORT = 8000
UPLOAD_DIR = "uploaded_logs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class TelecomAppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        if path == "/" or path == "/index.html":
            self.serve_file("web/index.html", "text/html")
        elif path.startswith("/api/exact_tables"):
            # Check if user uploaded files, else fallback to default cluster
            target_dir = UPLOAD_DIR if os.listdir(UPLOAD_DIR) else "KUBWA_TABLE VIEW"
            self.send_json_response(calculate_exact_telecom_tables(target_dir))
        elif path.startswith("/api/analytics"):
            self.send_json_response(analyze_dataset())
        elif path.startswith("/api/digest"):
            data = analyze_dataset()
            digest, ranking = generate_telecom_digest(data)
            self.send_json_response({"digest": digest, "ranking": ranking})
        elif path.startswith("/web/") or path.startswith("/tokens/"):
            filepath = path[1:] # remove leading slash
            if os.path.exists(filepath):
                mime, _ = mimetypes.guess_type(filepath)
                self.serve_file(filepath, mime or "application/octet-stream")
            else:
                self.send_error(404, "File not found")
        else:
            self.send_error(404, "Endpoint not found")
            
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        
        if path == "/api/upload_excel_batch":
            try:
                # Expecting JSON: {"files": [{"name": "MTN_4G RSRP.xlsx", "data_base64": "..."}]}
                # or direct raw parsing
                import base64
                req_data = json.loads(post_body.decode('utf-8'))
                file_list = req_data.get("files", [])
                
                saved_count = 0
                for item in file_list:
                    fname = os.path.basename(item.get("name", "upload.xlsx"))
                    b64_str = item.get("data_base64", "")
                    if b64_str:
                        if "," in b64_str:
                            b64_str = b64_str.split(",")[1]
                        file_bytes = base64.b64decode(b64_str)
                        out_path = os.path.join(UPLOAD_DIR, fname)
                        with open(out_path, "wb") as f:
                            f.write(file_bytes)
                        saved_count += 1
                        
                # Re-calculate exact tables immediately on uploaded files
                tables = calculate_exact_telecom_tables(UPLOAD_DIR)
                self.send_json_response({
                    "success": True,
                    "saved_files_count": saved_count,
                    "tables": tables
                })
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, status_code=500)
            return

        try:
            req_data = json.loads(post_body.decode('utf-8'))
        except Exception:
            req_data = {}
            
        if path == "/api/generate_report":
            provider = req_data.get("provider", "built_in")
            api_key = req_data.get("api_key", "").strip()
            custom_prompt = req_data.get("custom_prompt", "")
            
            target_dir = UPLOAD_DIR if os.listdir(UPLOAD_DIR) else "KUBWA_TABLE VIEW"
            data = analyze_dataset()
            digest, ranking = generate_telecom_digest(data)
            base_prompt = create_rno_prompt(digest, ranking)
            final_prompt = base_prompt if not custom_prompt else f"{base_prompt}\n\n=== USER SPECIAL FOCUS INSTRUCTIONS ===\n{custom_prompt}"
            
            if provider == "groq":
                res = call_groq_api(final_prompt, api_key=api_key)
            elif provider == "gemini":
                res = call_gemini_free_api(final_prompt, api_key=api_key)
            elif provider == "ollama":
                res = call_ollama_local(final_prompt)
            else: # built_in senior expert
                report = generate_deterministic_expert_report(digest, ranking, data)
                res = {"success": True, "text": report}
                
            self.send_json_response(res)
        else:
            self.send_error(404, "Endpoint not found")

    def serve_file(self, filepath, content_type):
        if not os.path.exists(filepath):
            self.send_error(404, "File not found")
            return
        with open(filepath, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def send_json_response(self, data, status_code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def start_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, TelecomAppHandler)
    print(f"[*] Telecom RNO AI Suite running at http://localhost:{PORT}")
    httpd.serve_forever()

if __name__ == "__main__":
    start_server()
