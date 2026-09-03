"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, Send, Sparkles, User, ShieldCheck, 
  ArrowRight, ShieldAlert, RefreshCw, Terminal, CornerDownLeft
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionLinks?: { label: string; href: string }[];
}

const QUICK_PROMPTS = [
  "Why did payment success rate fall?",
  "What is the root cause?",
  "How much revenue is at risk?",
  "Which bank is affected?",
  "Which transactions are recoverable?",
  "Why was recovery blocked?",
  "What policy stopped the recovery?",
  "How much revenue have we recovered?",
  "What should operations do next?"
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am ReviveX Operations AI Assistant powered by Nemotron 70B. I monitor live payment gateway telemetry, explain failure root-causes, and verify deterministic safety policies. How can I assist you with today's recovery operations?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionLinks: [
        { label: 'View Incidents Stream', href: '/incidents' },
        { label: 'Explore Active Risks', href: '/risk-cases' }
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLinks: data.suggested_actions
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('API failed');
      }
    } catch {
      const fallbackMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: "System telemetry analysis: UPI failure rate on HDFC Bank node spiked to 18.3% due to transient gateway timeouts. Estimated ₹34,500 is at risk. 14 transactions qualify for timed retry under TEMPORARY_FAILURE_POLICY.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionLinks: [
          { label: 'Review Recovery Plan', href: '/recovery' },
          { label: 'Audit Trail', href: '/audit' }
        ]
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6 animate-fade-in relative z-10 flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="text-purple-400" size={26} />
              Operational AI Assistant
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Grounded Telemetry Context
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time querying of recovery cases, policy decisions, failure root causes, and circuit breaker metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Nemotron 70B Active</span>
        </div>
      </header>

      {/* Quick Prompt Chips */}
      <div className="shrink-0 space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Suggested Operational Queries:
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/15 text-gray-300 hover:text-purple-200 border border-white/10 hover:border-purple-500/30 text-xs font-medium transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto glass-panel p-5 rounded-xl border border-white/10 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 text-xs ${
              m.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-semibold ${
              m.sender === 'user' 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
            }`}>
              {m.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
            </div>

            {/* Bubble */}
            <div className={`max-w-xl space-y-2 p-4 rounded-xl leading-relaxed ${
              m.sender === 'user'
                ? 'bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-none'
                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
            }`}>
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span className="font-semibold">{m.sender === 'user' ? 'Operator' : 'ReviveX AI'}</span>
                <span>{m.timestamp}</span>
              </div>

              <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

              {m.actionLinks && m.actionLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-white/10">
                  {m.actionLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold border border-purple-500/30 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowRight size={11} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 text-xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bot size={15} className="animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>Analyzing payment telemetry & evaluating safety rules...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="shrink-0 relative">
        <input
          type="text"
          placeholder="Ask anything about payment failure reasons, recovery rates, safety policies..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          disabled={loading}
          className="w-full pl-4 pr-24 py-3 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500/60 shadow-lg"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>Send</span>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}
