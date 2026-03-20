'use client';

import { useRef, useState } from 'react';

export interface ExtractedFields {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  experienceSummary?: string;
  [key: string]: string | undefined;
}

interface ResumeUploadProps {
  onParsed: (text: string, extracted: ExtractedFields) => void;
}

export default function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file.');
      setState('error');
      return;
    }

    setFileName(file.name);
    setState('loading');
    setErrorMsg('');

    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Parse failed');
      }

      onParsed(data.text, data.extracted || {});
      setState('done');
    } catch (e: any) {
      setErrorMsg(e.message || 'Something went wrong.');
      setState('error');
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">Upload Resume</span>
        <span className="text-xs text-slate-500">PDF only · auto-fills your profile</span>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-violet-500/60 hover:bg-slate-800/50'}
          ${state === 'done' ? 'border-emerald-500/60 bg-emerald-500/5' : ''}
          ${state === 'error' ? 'border-red-500/60 bg-red-500/5' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onInputChange}
        />

        {state === 'idle' && (
          <>
            <div className="text-3xl mb-2">📄</div>
            <p className="text-slate-300 text-sm font-medium">Drop your resume here</p>
            <p className="text-slate-500 text-xs mt-1">or click to browse · PDF only</p>
          </>
        )}

        {state === 'loading' && (
          <>
            <div className="text-3xl mb-2 animate-pulse">⏳</div>
            <p className="text-slate-300 text-sm font-medium">Parsing {fileName}…</p>
            <p className="text-slate-500 text-xs mt-1">Extracting your info</p>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="text-3xl mb-2">✅</div>
            <p className="text-emerald-400 text-sm font-medium">{fileName} — parsed!</p>
            <p className="text-slate-500 text-xs mt-1">Fields auto-filled below · click to replace</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            <p className="text-slate-500 text-xs mt-1">Click to try again</p>
          </>
        )}
      </div>
    </div>
  );
}
