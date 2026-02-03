#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VENV_DIR="$SCRIPT_DIR/.venv"

# Check if input file is provided
if [ -z "$1" ]; then
    echo "Usage: ./convert.sh <path_to_file> [options]"
    echo "Example: ./convert.sh my_vocabulary.docx"
    exit 1
fi

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

# Run the converter
"$VENV_DIR/bin/python" "$SCRIPT_DIR/src/main.py" "$@"
