'use client';

import { useState } from 'react';

export default function Home() {
  const [inputMethod, setInputMethod] = useState<'file' | 'text' | 'google-doc'>('text');
  const [textInput, setTextInput] = useState('');
  const [cards, setCards] = useState<any[]>([]);

  const handleGenerateCards = async () => {
    if (!textInput.trim()) {
      alert('Please enter some text');
      return;
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });

      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error generating cards:', error);
    }
  };

  const handleDownloadAnki = () => {
    if (cards.length === 0) return;
    
    const csvContent = cards
      .map(card => `"${card.front}"\t"${card.back}"`)
      .join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
    element.setAttribute('download', 'flashcards.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Anki Formatter</h1>
          <p className="text-xl text-gray-600">Convert your content into Anki flashcards effortlessly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setInputMethod('text')}
                  className={`px-5 py-2 rounded-lg font-medium transition ${
                    inputMethod === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Text Input
                </button>
                <button
                  onClick={() => setInputMethod('file')}
                  className={`px-5 py-2 rounded-lg font-medium transition ${
                    inputMethod === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setInputMethod('google-doc')}
                  className={`px-5 py-2 rounded-lg font-medium transition ${
                    inputMethod === 'google-doc'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Google Doc
                </button>
              </div>

              {inputMethod === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your content here
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter text to convert to flashcards..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {inputMethod === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload a file
                  </label>
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
              )}

              {inputMethod === 'google-doc' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Doc URL or ID
                  </label>
                  <input
                    type="text"
                    placeholder="Paste your Google Doc link..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <button
                onClick={handleGenerateCards}
                className="mt-6 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Generate Flashcards
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview</h2>
                
                {cards.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <p className="mb-2">No flashcards yet</p>
                    <p className="text-sm">Your cards will appear here after generation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-4">
                      {cards.length} cards generated
                    </div>
                    {cards.slice(0, 3).map((card, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-700 mb-1">{card.front}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">{card.back}</div>
                      </div>
                    ))}
                    {cards.length > 3 && (
                      <div className="text-sm text-gray-500 text-center py-2">
                        +{cards.length - 3} more cards
                      </div>
                    )}
                    <button
                      onClick={handleDownloadAnki}
                      className="w-full mt-4 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Download as .txt
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
