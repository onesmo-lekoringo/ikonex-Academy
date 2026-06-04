/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stream, Student, GradeBoundary, StudentResultSummary } from '../types';
import { Award, ShieldCheck, RefreshCw, Settings, Sliders, Trophy, ChevronRight } from 'lucide-react';

interface RankingsProps {
  streams: Stream[];
  students: Student[];
  results: StudentResultSummary[];
  gradeBoundaries: GradeBoundary[];
  onUpdateBoundaries: (boundaries: GradeBoundary[]) => void;
  onRefreshCalculations: () => void;
}

export default function Rankings({
  streams,
  students,
  results,
  gradeBoundaries,
  onUpdateBoundaries,
  onRefreshCalculations
}: RankingsProps) {
  // Config states
  const [selectedStreamId, setSelectedStreamId] = useState(streams[0]?.id || '');

  // Editing state for boundaries
  const [editingBoundaries, setEditingBoundaries] = useState<GradeBoundary[]>([...gradeBoundaries]);
  const [isEditingScale, setIsEditingScale] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Synchronize internal state when prop changes
  React.useEffect(() => {
    setEditingBoundaries([...gradeBoundaries]);
  }, [gradeBoundaries]);

  // Handle value change for bounds
  const handleBoundaryChange = (idx: number, field: 'min' | 'max' | 'remark', value: string) => {
    setEditingBoundaries(prev => {
      const copy = [...prev];
      if (field === 'remark') {
        copy[idx] = { ...copy[idx], remark: value };
      } else {
        copy[idx] = { ...copy[idx], [field]: Number(value) };
      }
      return copy;
    });
  };

  // Submit revised scale
  const handleSaveScale = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    let hasOrderError = false;
    for (let i = 0; i < editingBoundaries.length; i++) {
      const current = editingBoundaries[i];
      if (current.min < 0 || current.max > 100 || current.min > current.max) {
        hasOrderError = true;
        break;
      }
    }

    if (hasOrderError) {
      setUpdateMsg('Error: Invalid range boundaries (min must be <= max and within 0-100).');
      return;
    }

    onUpdateBoundaries(editingBoundaries);
    setIsEditingScale(false);
    setUpdateMsg('Grading scale updated successfully. Scores recalculated.');
    setTimeout(() => setUpdateMsg(''), 4000);
  };

  // List of ranked students for selected stream
  const activeStreamResults = results
    .filter(r => r.streamId === selectedStreamId)
    .sort((a, b) => a.classPosition - b.classPosition);

  // Stream Obj details
  const currentStream = streams.find(st => st.id === selectedStreamId);

  const handleDownloadClassReportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;
      
      const element = document.getElementById('rankings_leaderboard_card');
      if (!element) {
        alert('Could not find rankings element.');
        return;
      }
      
      const btn = document.getElementById('btn_download_class_report_pdf');
      if (btn) {
        btn.setAttribute('disabled', 'true');
        btn.innerText = 'Generating...';
      }
      
      await new Promise(r => setTimeout(r, 300));
      
      const selector = document.getElementById('rankings_select_stream');
      const downloadBtn = document.getElementById('btn_download_class_report_pdf');
      
      if (selector) selector.style.visibility = 'hidden';
      if (downloadBtn) downloadBtn.style.visibility = 'hidden';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      if (selector) selector.style.visibility = 'visible';
      if (downloadBtn) downloadBtn.style.visibility = 'visible';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const calculatedHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, calculatedHeight);
      
      const fileName = `ClassReport_${currentStream?.name.replace(/\s+/g, '_') || 'Stream'}.pdf`;
      pdf.save(fileName);
      
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerText = 'Download PDF Report';
      }
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert(`PDF Export Failed: ${err.message}`);
      const btn = document.getElementById('btn_download_class_report_pdf');
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerText = 'Download PDF Report';
      }
    }
  };

  return (
    <div className="space-y-6" id="rankings_module">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="text-indigo-650 text-indigo-600" size={24} />
            Academic Rankings & Configurable Grading
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Recalculate average percentages, class stream rankings, and configure subject grading thresholds dynamically
          </p>
        </div>

        {/* Recalculate shortcut */}
        <button
          onClick={onRefreshCalculations}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition cursor-pointer"
        >
          <RefreshCw size={13} />
          Force Re-index Ranks
        </button>
      </div>

      {/* Two Grid Layout: Ranking Leaderboard (Left) & Configurable scale (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stream Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs" id="rankings_leaderboard_card">
            {/* Selector list */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Stream-Wise Leaders Board</h3>
                <p className="text-[11px] text-slate-500">View rankings by choosing a target stream</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadClassReportPDF}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                  id="btn_download_class_report_pdf"
                  type="button"
                >
                  Download PDF Report
                </button>
                
                <select
                  value={selectedStreamId}
                  onChange={e => setSelectedStreamId(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  id="rankings_select_stream"
                >
                  {streams.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leaderboard list */}
            <div className="space-y-3">
              {activeStreamResults.length > 0 ? (
                activeStreamResults.map((r, i) => {
                  const isTop3 = r.classPosition <= 3;
                  const trophyColor = r.classPosition === 1 ? 'text-amber-500 bg-amber-50 border border-amber-200' :
                                      r.classPosition === 2 ? 'text-slate-400 bg-slate-50 border border-slate-200' :
                                      r.classPosition === 3 ? 'text-amber-700 bg-amber-50/50 border border-amber-200/50' : 'text-slate-500 bg-slate-50';

                  return (
                    <div 
                      key={r.studentId} 
                      className="flex items-center justify-between p-3 border border-slate-150 rounded-xl hover:border-indigo-100 transition"
                      id={`student_rank_${r.studentId}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-xs ${trophyColor}`}>
                          #{r.classPosition}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{r.studentName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono block">ADM NO: {r.admissionNo} • Assigned: {currentStream?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">Marks</span>
                          <strong className="text-xs text-slate-700 block">{r.totalMarks} Total</strong>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">GPA / Average</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.averageScore >= 80 ? 'bg-green-50 text-green-700' : r.averageScore >= 50 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {r.averageScore}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">Grade</span>
                          <strong className="text-xs text-slate-800 block font-black">{r.overallGrade}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No graded students currently present in this stream. Go to Gradebook to log scores.
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Configurable scale */}
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Settings size={15} className="text-slate-400" />
                Grading Threshold Scales
              </h3>
              <button
                onClick={() => setIsEditingScale(!isEditingScale)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline hover:no-underline"
              >
                {isEditingScale ? 'Cancel Edit' : 'Edit Ranges'}
              </button>
            </div>

            {updateMsg && (
              <p className="text-[11px] font-semibold text-green-600 mb-3 bg-green-50 border border-green-150 rounded p-1.5 text-center">
                {updateMsg}
              </p>
            )}

            <form onSubmit={handleSaveScale} className="space-y-4">
              <div className="space-y-3 font-sans">
                {editingBoundaries.map((b, i) => (
                  <div key={b.grade} className="flex items-center space-x-3 text-xs justify-between bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                    <span className="w-6 font-black text-slate-900 text-sm font-mono text-center block">{b.grade}</span>
                    <div className="flex gap-2 items-center text-[11px] text-slate-500">
                      {isEditingScale ? (
                        <>
                          <input
                            type="number"
                            value={b.min}
                            onChange={e => handleBoundaryChange(i, 'min', e.target.value)}
                            className="w-12 text-center p-1 border border-slate-200 rounded font-mono bg-white"
                            min="0"
                            max="100"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            value={b.max}
                            onChange={e => handleBoundaryChange(i, 'max', e.target.value)}
                            className="w-12 text-center p-1 border border-slate-200 rounded font-mono bg-white"
                            min="0"
                            max="100"
                          />
                        </>
                      ) : (
                        <span className="font-semibold text-slate-650 min-w-16 text-center text-slate-700">
                          {b.min}% - {b.max}%
                        </span>
                      )}
                    </div>
                    
                    <div className="grow">
                      {isEditingScale ? (
                        <input
                          type="text"
                          value={b.remark}
                          onChange={e => handleBoundaryChange(i, 'remark', e.target.value)}
                          className="w-full p-1 border border-slate-200 rounded text-[11px] bg-white text-slate-700"
                        />
                      ) : (
                        <span className="text-[11px] italic text-slate-400 block text-right font-semibold text-indigo-600">
                          {b.remark}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isEditingScale && (
                <button
                  type="submit"
                  className="w-full text-center py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                  id="btn_save_grading_schema"
                >
                  Apply Grading Schema
                </button>
              )}
            </form>
          </div>

          {/* Integrity info */}
          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 flex items-start space-x-3 text-[11px] text-teal-800 leading-relaxed">
            <div className="p-1 px-1.5 bg-teal-100 rounded text-teal-700 font-mono font-black border border-teal-200">
              3NF
            </div>
            <div>
              <strong className="text-xs font-bold text-teal-900 block mb-0.5">Relational Sync Invariant</strong>
              Ranks, grades, grand-totals, and class stream positions recalculate atomically. Zero duplicated student/subject tuples are allowed in our system layer.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
