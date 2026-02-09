from flask import Flask, render_template, request, send_file, jsonify
import os
import tempfile
from werkzeug.utils import secure_filename
import sys
import requests
import re
import json

# Ensure src modules are reachable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from file_handler import FileHandler
from parser import Parser
from anki_generator import AnkiGenerator

app = Flask(__name__)
# Max file size 16MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

ALLOWED_EXTENSIONS = {'txt', 'csv', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def download_google_doc(url):
    """
    Extracts Doc ID and downloads content as TXT.
    Returns path to temp file.
    """
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        raise ValueError("Invalid Google Docs URL")
    
    doc_id = match.group(1)
    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
    
    response = requests.get(export_url, timeout=30)
    if response.status_code != 200:
        raise Exception(f"Failed to download. Status: {response.status_code}")
    
    filename = f"google_doc_{doc_id}.txt"
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(path, 'wb') as f:
        f.write(response.content)
    
    return path, filename

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/parse', methods=['POST'])
def parse_file():
    temp_path = None
    original_filename = "deck"

    try:
        doc_url = request.form.get('doc_url')
        raw_text = request.form.get('raw_text')
        
        if doc_url:
            temp_path, original_filename = download_google_doc(doc_url)
            original_filename = os.path.splitext(original_filename)[0]
        
        elif raw_text:
            # Create a temp file for consistency with FileHandler
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as tmp:
                tmp.write(raw_text)
                temp_path = tmp.name
            original_filename = "pasted_text"

        elif 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            if not allowed_file(file.filename):
                return jsonify({'error': 'Invalid file type'}), 400
            
            original_filename = secure_filename(file.filename)
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
            file.save(temp_path)
            original_filename = os.path.splitext(original_filename)[0]
        else:
             return jsonify({'error': 'No content provided'}), 400

        lines = FileHandler.read_file(temp_path)
        
        parser_obj = Parser(lines)
        result = parser_obj.parse()
        
        return jsonify({
            'success': True,
            'filename': original_filename,
            'cards': [{'question': t, 'answer': d} for t, d in result['success']],
            'failures': result['failures'],
            'stats': result['stats']
        })

    except Exception as e:
            return jsonify({'error': str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)



@app.route('/generate', methods=['POST'])
def generate_deck():
    """
    Step 2: Generate .apkg
    """
    data = request.json
    if not data or 'cards' not in data:
        return jsonify({'error': 'No data provided'}), 400

    cards = data['cards']
    deck_name = data.get('deck_name', 'Smart Deck')
    filename = data.get('filename', 'deck')
    
    safe_filename = secure_filename(filename) 
    if not safe_filename: 
        safe_filename = "deck"
    
    output_filename = f"{safe_filename}.apkg"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    try:
        generator = AnkiGenerator(deck_name=deck_name)
        tuple_data = [(c['question'], c['answer']) for c in cards]
        generator.add_notes(tuple_data)
        generator.create_package(output_path)

        return jsonify({
            'success': True,
            'download_url': f'/download/{output_filename}'
        })

    except Exception as e:
        # Clean up on failure
        if os.path.exists(output_path):
            os.remove(output_path)
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    safe_name = secure_filename(filename)
    if not safe_name:
        return jsonify({'error': 'Invalid filename'}), 400
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
