/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Stream, Student, Subject, Score, GradeBoundary, StudentResultSummary } from '../types';
import { MessageSquare, Send, X, Bot, AlertTriangle, Sparkles, Loader, GraduationCap } from 'lucide-react';
// Custom Robot with Graduation Cap Hat
function BotIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Graduation Cap Hat */}
      <GraduationCap className="absolute top-[1px] w-4.5 h-4.5 text-indigo-350 -rotate-6 z-10" />
      {/* Robot Face */}
      <Bot className="w-5 h-5 text-indigo-400 mt-1.5" />
    </div>
  );
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatbotProps {
  students: Student[];
  streams: Stream[];
  subjects: Subject[];
  scores: Score[];
  results: StudentResultSummary[];
  gradeBoundaries: GradeBoundary[];
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function Chatbot({
  students,
  streams,
  subjects,
  scores,
  results,
  gradeBoundaries,
  authenticatedFetch
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: 'Hello! I am **Iko**, your AI Academic Assistant. I have live access to the academy database. You can ask me about students, streams, subject performance, and leaderboard rankings!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interactive Action Chips
  const actionChips = [
    { label: '🏆 Leaderboard', query: 'Who is the top performing student?' },
    { label: '📊 Mean Score', query: 'What is the overall academy mean score?' },
    { label: '🏫 Streams', query: 'Which class stream has the highest average?' },
    { label: '📚 Subjects', query: 'List all subjects and their departments' }
  ];

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  // Serialize current database state for model context
  const getDatabaseContext = () => {
    const streamsSummary = streams
      .map(s => `- ${s.name} (Room: ${s.roomNumber}, Teacher: ${s.classTeacher}, ID: ${s.id})`)
      .join('\n');

    const studentsSummary = students
      .map(s => `- ${s.name} (Adm: ${s.admissionNo}, Gender: ${s.gender}, Status: ${s.status}, Stream ID: ${s.streamId})`)
      .join('\n');

    const subjectsSummary = subjects
      .map(s => `- ${s.name} (Code: ${s.code}, Dept: ${s.department}, Stream IDs: ${s.assignedStreamIds.join(',')})`)
      .join('\n');

    const boundariesSummary = gradeBoundaries
      .map(g => `- Grade ${g.grade}: ${g.min}-${g.max}% (${g.remark})`)
      .join('\n');

    // Summarize score list shortly
    const resultsSummary = results
      .map(r => `- ${r.studentName} (${r.admissionNo}): Stream ${r.streamName}, Average: ${r.averageScore}%, Grade: ${r.overallGrade}, Class Pos: ${r.classPosition}/${r.totalStudentsInClass}`)
      .join('\n');

    return `
=== ACTIVE CLASS STREAMS ===
${streamsSummary || 'No streams configured.'}

=== ENROLLED STUDENTS ===
${studentsSummary || 'No students enrolled.'}

=== ACADEMIC CURRICULUM ===
${subjectsSummary || 'No subjects offered.'}

=== GRADING BOUNDARIES ===
${boundariesSummary || 'No grade boundaries.'}

=== REAL-TIME STUDENT RANKINGS AND AVERAGES ===
${resultsSummary || 'No grades computed yet.'}
`.trim();
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorText(null);
    const userMessage = textToSend.trim();
    setInputMessage('');
    
    // Add user message to log
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare history array matching API expectation
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory,
          systemContext: getDatabaseContext()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error communicating with AI endpoint.');
      }

      setMessages(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorText(err.message || 'Could not reach AI Assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom inline markdown parsing for bold and code tags
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-slate-800/80 px-1 py-0.5 rounded text-[11px] font-mono text-indigo-300 border border-slate-700/50">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Custom block-level markdown rendering for lists and tables
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTable: { headers: string[]; rows: string[][] } | null = null;
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushTable = (key: number) => {
      if (!currentTable) return null;
      const tbl = (
        <div key={`table-${key}`} className="overflow-x-auto my-3 border border-slate-700/60 rounded-lg shadow-md max-w-full">
          <table className="min-w-full divide-y divide-slate-700 text-left text-xs">
            <thead className="bg-slate-800 text-slate-350">
              <tr>
                {currentTable.headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-1.5 font-bold text-slate-300 border-b border-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750 bg-slate-900/40">
              {currentTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/35">
                  {row.map((val, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-slate-200">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
      return tbl;
    };

    const flushList = (key: number) => {
      if (!currentList) return null;
      const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
      const listClass = currentList.type === 'ol' 
        ? 'list-decimal pl-6 my-2 text-xs space-y-1 text-slate-250' 
        : 'list-disc pl-5 my-2 text-xs space-y-1 text-slate-250';
      const lst = (
        <ListTag key={`list-${key}`} className={listClass}>
          {currentList.items.map((item, idx) => (
            <li key={idx} className="text-slate-200">
              {renderInline(item)}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
      return lst;
    };

    let elementKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Table formatting check
      if (line.startsWith('|')) {
        if (currentList) {
          elements.push(flushList(elementKey++));
        }

        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const isSeparator = parts.every(p => p.startsWith('-'));
        
        if (isSeparator) continue;

        if (!currentTable) {
          currentTable = { headers: parts, rows: [] };
        } else {
          currentTable.rows.push(parts);
        }
        continue;
      }

      if (currentTable) {
        elements.push(flushTable(elementKey++));
      }

      // Unordered lists
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const content = line.substring(2);
        if (!currentList || currentList.type !== 'ul') {
          if (currentList) elements.push(flushList(elementKey++));
          currentList = { type: 'ul', items: [content] };
        } else {
          currentList.items.push(content);
        }
        continue;
      }

      // Ordered lists
      const olMatch = line.match(/^(\d+)\.\s(.*)/);
      if (olMatch) {
        const content = olMatch[2];
        if (!currentList || currentList.type !== 'ol') {
          if (currentList) elements.push(flushList(elementKey++));
          currentList = { type: 'ol', items: [content] };
        } else {
          currentList.items.push(content);
        }
        continue;
      }

      if (currentList) {
        elements.push(flushList(elementKey++));
      }

      if (line === '') continue;

      // Normal text paragraphs
      elements.push(
        <p key={elementKey++} className="my-1.5 leading-relaxed text-xs text-slate-200">
          {renderInline(line)}
        </p>
      );
    }

    if (currentTable) {
      elements.push(flushTable(elementKey++));
    }
    if (currentList) {
      elements.push(flushList(elementKey++));
    }

    return elements;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="chatbot_widget">
      
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div 
          className="w-96 h-[520px] max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-fade-in backdrop-blur-md"
          id="chatbot_drawer"
        >
          {/* Header */}
          <header className="px-5 py-4 bg-slate-850/80 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BotIcon className="w-8 h-8 bg-slate-800 border border-slate-700/65 rounded-lg" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Iko - AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online • Academic Assistant
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </header>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            
            {messages.map((msg, index) => {
              const isAI = msg.role === 'model';
              return (
                <div 
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                >
                  {isAI && (
                    <BotIcon className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/50" />
                  )}
                  
                  <div className={`rounded-xl px-4 py-2.5 text-xs ${
                    isAI 
                      ? 'bg-slate-850 text-slate-100 border border-slate-800 rounded-tl-none' 
                      : 'bg-indigo-600 text-slate-100 rounded-tr-none shadow-md shadow-indigo-650/10'
                  }`}>
                    {isAI ? parseMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center text-indigo-400 shrink-0">
                  <Loader size={14} className="animate-spin" />
                </div>
                <div className="bg-slate-850 text-slate-400 rounded-xl rounded-tl-none px-4 py-2.5 text-xs border border-slate-800 flex items-center gap-2">
                  <span>Iko is analyzing academy data...</span>
                </div>
              </div>
            )}

            {/* Configuration Error Notice */}
            {errorText && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertTriangle size={15} />
                  <span>Assistant Service Error</span>
                </div>
                <p className="leading-relaxed">{errorText}</p>
                {errorText.includes('GEMINI_API_KEY') && (
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto select-all">
                    # Add to your backend .env file:<br />
                    GEMINI_API_KEY="your_api_key_here"
                  </div>
                )}
              </div>
            )}

            {/* Quick Suggestion Guide */}
            {messages.length === 1 && (
              <div className="bg-slate-850/40 border border-slate-800/50 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-350">Interactive Assistant Guide</p>
                <p className="leading-relaxed text-[11px]">Click any of the quick-action chips at the bottom to instantly query the live database (Leaderboard, Mean Score, Streams, or Subjects), or type your own question in the input box below.</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Quick Action Chips */}
          <div className="px-3 py-2 bg-slate-900/85 border-t border-slate-800/60 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {actionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.query)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-full text-[10px] text-slate-305 text-slate-300 hover:text-white transition-all cursor-pointer font-medium hover:border-slate-700 active:scale-95 shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Form input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputMessage);
            }}
            className="p-3 bg-slate-850 border-t border-slate-800/80 flex gap-2 items-center"
            id="chatbot_input_form"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder="Ask about students, grades, streams..."
              className="grow bg-slate-900 border border-slate-750/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="w-8 h-8 rounded-lg bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed transition-all"
              aria-label="Send query"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Widget Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer relative border ${
          isOpen
            ? 'bg-slate-800 border-slate-700 text-white'
            : 'bg-indigo-600 border-indigo-550 text-white hover:bg-indigo-500 shadow-indigo-650/20'
        }`}
        id="chatbot_trigger_btn"
        title="Open AI Assistant"
      >
        {isOpen ? <X size={20} /> : <BotIcon className="w-9 h-9" />}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-teal-400 border-2 border-white rounded-full animate-bounce"></span>
        )}
      </button>

    </div>
  );
}
