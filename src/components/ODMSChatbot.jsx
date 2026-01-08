// ----------------------------------------------
// src/components/ODMSChatbot.jsx (with API key)
// ----------------------------------------------
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

const ODMSChatbot = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hello! I'm your AI-powered Organ Donation Assistant. I can help you with:\n\n• Understanding organ donation process\n• Eligibility criteria\n• Debunking common myths\n• Guiding you through registration\n• Answering general questions\n\nHow can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // System prompt for AI
  const SYSTEM_PROMPT = `You are an expert AI assistant for an Organ Donor Management System. Your role is to provide accurate, compassionate, and helpful information about organ donation.

Key responsibilities:
1. Answer questions about organ donation eligibility, process, and requirements
2. Debunk common myths with factual information
3. Guide users through registration processes
4. Provide emotional support and encouragement
5. Explain medical terminology in simple terms
6. Address concerns about safety, ethics, and religious aspects

Guidelines:
- Be empathetic and encouraging
- Use simple, clear language
- Cite facts when discussing medical information
- Emphasize that one donor can save up to 8 lives
- Encourage family discussions about donation decisions
- Never provide medical diagnosis or treatment advice
- Always suggest consulting healthcare professionals for medical decisions

Context: You're helping users in India, so be aware of local regulations and cultural considerations.`;

  // Get AI Response using Groq
  const getAIResponse = async (userMessage) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Error:', error);
      return "I apologize, but I'm having trouble connecting to my AI service right now. Please try again in a moment, or ask me about:\n\n• Eligibility criteria\n• Donation process\n• Common myths\n• Registration steps";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(currentInput);
      
      const botResponse = {
        type: 'bot',
        text: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorResponse = {
        type: 'bot',
        text: "I apologize, but I encountered an error. Please try again or rephrase your question.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Eligibility Criteria', query: 'Who is eligible to donate organs?' },
    { label: 'How to Register', query: 'How do I register as an organ donor?' },
    { label: 'Common Myths', query: 'What are common myths about organ donation?' },
    { label: 'Living Donation', query: 'Can I donate organs while alive?' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Bot size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-2xl">ODMS AI Assistant</h2>
                <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
                  <Sparkles size={14} />
                  AI Powered
                </span>
              </div>
              <p className="text-white/90 text-sm">Powered by NixBot</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'bot' && (
              <div className="bg-gradient-to-br from-green-500 to-green-500 text-white p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                <Bot size={20} />
              </div>
            )}
            <div
              className={`max-w-[75%] p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-green-500 to-green-500 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-md border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>
              <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.type === 'user' && (
              <div className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-gradient-to-br from-green-500 to-green-500 text-white p-2 rounded-full h-10 w-10 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-sm shadow-md">
              <Loader2 className="animate-spin text-red-500" size={24} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInput(action.query)}
                className="text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about organ donation..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-green-500 to-green-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={20} />
            <span className="font-medium">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
          🤖 Powered by NixBot • Saves lives through information
        </p>
      </div>
    </div>
  );
};

export default ODMSChatbot;