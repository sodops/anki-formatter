#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VENV_DIR="$SCRIPT_DIR/.venv"

# Ensure venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

echo "Starting Web Interface..."
echo "Open your browser at: http://127.0.0.1:5000"

"$VENV_DIR/bin/python" "$SCRIPT_DIR/src/app.py"
