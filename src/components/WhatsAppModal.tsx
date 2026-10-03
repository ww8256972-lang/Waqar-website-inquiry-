import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Copy, Check, Sparkles, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { Customer, WhatsAppTemplate } from '../types';
import { api } from '../api/client';

interface WhatsAppModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [managingTemplates, setManagingTemplates] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newBody, setNewBody] = useState('');

  const loadTemplates = async () => {
    try {
      const list = await api.getWhatsAppTemplates();
      setTemplates(list);
      if (list.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(list[0].id);
        applyTemplate(list[0].template_body);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      loadTemplates();
      setCopied(false);
    }
  }, [isOpen, customer]);

  const interpolate = (tpl: string): string => {
    if (!customer) return tpl;
    return tpl
      .replace(/{name}/g, customer.name || 'Valued Client')
      .replace(/{business}/g, customer.business_name || 'your business')
      .replace(/{website}/g, customer.website_name || customer.website_type_name || 'website')
      .replace(/{amount}/g, `₹${customer.quoted_price?.toLocaleString() || '0'}`)
      .replace(/{due}/g, `₹${customer.remaining_amount?.toLocaleString() || '0'}`)
      .replace(/{date}/g, customer.follow_up_date || new Date().toISOString().split('T')[0])
      .replace(/{phone}/g, customer.phone || '');
  };

  const applyTemplate = (body: string) => {
    setMessage(interpolate(body));
  };

  const handleSelectTemplate = (t: WhatsAppTemplate) => {
    setSelectedTemplateId(t.id);
    applyTemplate(t.template_body);
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phone) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    try {
      await api.createWhatsAppTemplate({
        title: newTitle.trim(),
        category: newCategory,
        template_body: newBody.trim()
      });
      setNewTitle('');
      setNewBody('');
      setManagingTemplates(false);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.deleteWhatsAppTemplate(id);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 text-xs">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">WhatsApp Quick Action</h2>
              <p className="text-xs text-slate-400">
                To: {customer.name} &bull; {customer.phone}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Template Selectors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Template
              </span>
              <button
                type="button"
                onClick={() => setManagingTemplates(!managingTemplates)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {managingTemplates ? 'Back to Editor' : '+ Manage Templates'}
              </button>
            </div>

            {!managingTemplates ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/80">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      selectedTemplateId === t.id
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold truncate">{t.title}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{t.category}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <form onSubmit={handleCreateTemplate} className="space-y-2">
                  <div className="font-bold text-white text-xs">Add New Template</div>
                  <input
                    type="text"
                    required
                    placeholder="Template Title (e.g. Discount Offer)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                  <textarea
                    required
                    rows={3}
                    placeholder="Body text. Variables: {name}, {business}, {website}, {amount}, {due}"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
                  >
                    Save Template
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Existing Templates</div>
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 text-slate-300">
                      <span className="truncate">{t.title}</span>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message preview / edit textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Personalized Message (Editable)
              </label>
              <span className="text-[10px] text-slate-500">
                {message.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs leading-relaxed focus:border-emerald-500 focus:outline-none"
              placeholder="Write your WhatsApp message here..."
            />
          </div>

          {/* Variables Reference Pill bar */}
          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 items-center">
            <span className="font-semibold text-slate-500">Variables:</span>
            <button type="button" onClick={() => setMessage(m => m + ' {name}')} className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono">
              {'{name}'}
            </button>
            <button type="button" onClick={() => setMessage(m => m + ' {business}')} className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono">
              {'{business}'}
            </button>
            <button type="button" onClick={() => setMessage(m => m + ' {website}')} className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono">
              {'{website}'}
            </button>
            <button type="button" onClick={() => setMessage(m => m + ' {amount}')} className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono">
              {'{amount}'}
            </button>
            <button type="button" onClick={() => setMessage(m => m + ' {due}')} className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono">
              {'{due}'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-98 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
