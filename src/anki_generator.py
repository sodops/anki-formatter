import genanki
import random

class AnkiGenerator:
    def __init__(self, deck_name="Smart Vocabulary Deck", deck_id=None):
        self.deck_name = deck_name
        # Ensure deck_id is a unique random integer (Anki uses positive integers)
        self.deck_id = deck_id if deck_id else random.randrange(1 << 30, 1 << 31)
        
        # Use a FIXED Model ID so that re-importing updates existing cards instead of creating conflicts
        # Generated random ID: 1597534682
        self.model_id = 1597534682
        
        self.model = genanki.Model(
            self.model_id,
            'Smart Anki Model v1', # Fixed name
            fields=[
                {'name': 'Question'},
                {'name': 'Answer'},
            ],
            templates=[
                {
                    'name': 'Card 1',
                    'qfmt': '<div class="card-content">{{Question}}</div>',
                    'afmt': '{{FrontSide}}<hr id="answer"><div class="card-content">{{Answer}}</div>',
                },
            ],
            css="""
            .card {
                font-family: arial;
                font-size: 20px;
                text-align: center;
                color: black;
                background-color: white;
            }
            .card-content {
                padding: 20px;
            }
            """
        )
        
        self.deck = genanki.Deck(self.deck_id, self.deck_name)

    def add_notes(self, parsed_data):
        """
        parsed_data: List of (term, definition) tuples
        """
        count = 0
        for term, definition in parsed_data:
            note = genanki.Note(
                model=self.model,
                fields=[term, definition]
            )
            self.deck.add_note(note)
            count += 1
        return count

    def create_package(self, output_file="output.apkg"):
        package = genanki.Package(self.deck)
        package.write_to_file(output_file)
        return output_file
