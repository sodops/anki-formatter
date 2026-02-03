from collections import Counter
import re

class Parser:
    def __init__(self, content_lines):
        self.lines = content_lines
        self.parsed_data = [] # List of (term, definition) tuples
        self.failed_lines = [] # List of strings with reasons
        
        # Prioritized list of separators. 
        # Longer/Specific ones first to avoid false positives (e.g. ' -> ' before '-')
        self.separators = [
            ' == ', '==',           # Strong equality
            ' -> ', '->',           # Arrows
            ' => ', '=>', 
            ' ⇒ ', '⇒', ' → ', '→',
            ' - ', ' – ', ' — ',    # Dash with spaces (High confidence)
            ' : ',                  # Colon with spaces
            ' = ',                  # Equals with spaces
            '\t'                    # Tab
        ]

    def find_best_split(self, line):
        """
        scans the line for the best separator match.
        Returns (separator, part1, part2) or None.
        """
        for sep in self.separators:
            if sep in line:
                parts = line.split(sep, 1)
                return sep, parts[0], parts[1]
        
        return None

    def is_likely_title_or_grammar(self, term, definition):
        """
        Heuristic AI: Detects if a parsed pair is likely a Header, Title, or Grammar rule.
        """
        term = term.strip()
        definition = definition.strip()

        # 0. Empty check
        if not term or not definition:
            return "Empty Term/Def"

        # 1. Structure Check: "S+verb" usually indicates grammar
        if '+' in term and 'verb' in term.lower():
            return "Grammar Pattern (S+Verb)"
            
        # 2. Length Check: Term > 10 words -> Sentence/Header
        if len(term.split()) > 10:
            return "Term too long (>10 words)"

        # 3. Capitalization: HEADERS ARE OFTEN ALL CAPS (and > 1 word)
        if term.isupper() and len(term.split()) > 1:
            return "All Caps Header"
        
        return None # Looks valid

    def clean_line_start(self, line):
        """
        Removes numbering (1.), bullets (•), arrows (⇒) from the START of the ENTIRE line.
        This prevents '-> apple - fruit' from being split at the first arrow.
        """
        # Regex explanation:
        # ^ : Start of string
        # [\s]* : Optional whitespace
        # (?: ... ) : Non-capturing groups for alternatives
        # \d+\. : Numbers like "1."
        # [•\-\–\—\>\→\⇒\●\*]+ : Bullet chars including arrows
        # [\s]* : Trailing whitespace
        clean = re.sub(r'^[\s]*((?:\d+\.)|[•\-\–\—\>\→\⇒\●\*]+)[\s]*', '', line)
        return clean.strip()

    def parse(self):
        print(f"Parsing {len(self.lines)} lines with Adaptive AI (Clean First)...")
        
        for line in self.lines:
            original_line = line.strip()
            if not original_line:
                continue

            # 1. Clean Line Start (Crucial fix for "-> Term - Def")
            cleaned_line = self.clean_line_start(original_line)
            
            if not cleaned_line:
                continue

            # 2. Find Split on the CLEANED line
            split_result = self.find_best_split(cleaned_line)
            
            if not split_result:
                # No known separator found
                self.failed_lines.append(f"[No Separator] {original_line}")
                continue
                
            sep, raw_term, raw_def = split_result
            
            # 3. Term is likely clean now, but trim spaces
            term = raw_term.strip()
            definition = raw_def.strip()
            
            # 4. Validation / AI Filter
            rejection_reason = self.is_likely_title_or_grammar(term, definition)
            
            if rejection_reason:
                # Log with specific reason
                self.failed_lines.append(f"[Ignored: {rejection_reason}] {original_line}")
                continue

            # 5. Success
            self.parsed_data.append((term, definition))
        
        return {
            'success': self.parsed_data,
            'failures': self.failed_lines,
            'stats': {
                'total': len(self.lines),
                'parsed': len(self.parsed_data),
                'failed': len(self.failed_lines)
            }
        }
