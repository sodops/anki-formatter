import argparse
import sys
import os

# Add the current directory to sys.path to ensure modules are found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from file_handler import FileHandler
from parser import Parser
from anki_generator import AnkiGenerator

def main():
    parser = argparse.ArgumentParser(description="Smart Anki Converter: Convert vocabulary lists to .apkg files.")
    parser.add_argument("input_file", help="Path to the input file (.txt, .docx, .csv)")
    parser.add_argument("--deck", help="Name of the Anki Deck", default="Imported Vocabulary")
    parser.add_argument("--output", help="Output file name (default: <input_filename>.apkg)")

    args = parser.parse_args()

    input_path = args.input_file
    
    if not os.path.exists(input_path):
        print(f"Error: File '{input_path}' not found.")
        return

    print(f"Reading file: {input_path}...")
    try:
        lines = FileHandler.read_file(input_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    print(f"Parsing content ({len(lines)} lines)...")
    parser_obj = Parser(lines)
    result = parser_obj.parse()

    success_count = len(result['success'])
    failure_count = len(result['failures'])
    
    print("\n" + "="*40)
    print("PARSING REPORT")
    print("="*40)
    print(f"Successful pairs: {success_count}")
    print(f"Failed lines:     {failure_count}")
    
    if failure_count > 0:
        print("\n[!] The following lines could not be parsed:")
        for i, line in enumerate(result['failures'][:10]):
            print(f"  {i+1}: {line}")
        if failure_count > 10:
            print(f"  ... and {failure_count - 10} more.")
    
    print("="*40 + "\n")

    if success_count == 0:
        print("No valid cards found. Aborting.")
        return

    # Determine output filename
    if args.output:
        output_file = args.output
    else:
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_file = f"{base_name}.apkg"

    # Confirm if failures exist
    if failure_count > 0:
        # In an interactive script we might ask for confirmation, 
        # but for a tool we usually proceed with what we have unless it's critical.
        print("Proceeding to generate deck with valid entries...")

    print(f"Generating Anki Deck: '{args.deck}'...")
    generator = AnkiGenerator(deck_name=args.deck)
    generator.add_notes(result['success'])
    
    try:
        out_path = generator.create_package(output_file)
        print(f"SUCCESS! Anki package created: {os.path.abspath(out_path)}")
    except Exception as e:
        print(f"Error creating package: {e}")

if __name__ == "__main__":
    main()
