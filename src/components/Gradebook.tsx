/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stream, Student, Subject, Score, GradeBoundary } from '../types';
import { Award, PencilLine, ShieldAlert, Save, RefreshCw, BarChart2, CheckSquare } from 'lucide-react';
import { calculateGradeAndRemark } from '../data/mockData';

interface GradebookProps {
  streams: Stream[];
  students: Student[];
  subjects: Subject[];
  scores: Score[];
  gradeBoundaries: GradeBoundary[];
  onUpsertScore: (score: Omit<Score, 'id'>) => void;
  onBatchUpsertScores: (scores: Omit<Score, 'id'>[]) => void;
}

export default function Gradebook({
  streams,
  students,
  subjects,
  scores,
  gradeBoundaries,
  onUpsertScore,
  onBatchUpsertScores
}: GradebookProps) {
  // Selection States
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Editable temporary inputs state
  // Map of studentId -> { ca: string, exam: string, errors: string }
  const [editGrid, setEditGrid] = useState<Record<string, { ca: string; exam: string; error: string }>>({});
  const [bulkMessage, setBulkMessage] = useState({ text: '', type: 'info' });

  // Get active subjects filtered by selected stream mappings
  const activeStreamSubjects = subjects.filter(sub => sub.assignedStreamIds.includes(selectedStreamId));

  // Get active students for selected stream
  const activeStreamStudents = students.filter(
    st => st.streamId === selectedStreamId && st.status === 'Active'
  );

  // Trigger grid initialization when selection bounds align
  const handleLoadGrid = () => {
    if (!selectedStreamId || !selectedSubjectId) return;

    // Load existing scores into editGrid
    const initialGrid: typeof editGrid = {};
    activeStreamStudents.forEach(student => {
      const match = scores.find(s => s.studentId === student.id && s.subjectId === selectedSubjectId);
      
      initialGrid[student.id] = {
        ca: match ? String(match.continuousAssessment) : '0',
        exam: match ? String(match.exam) : '0',
        error: ''
      };
    });

    setEditGrid(initialGrid);
    setBulkMessage({ text: 'Roster grades loaded successfully. Editing active.', type: 'info' });
  };

  // Synchronize load state on dropdown selection
  React.useEffect(() => {
    if (selectedStreamId && selectedSubjectId) {
      handleLoadGrid();
    } else {
      setEditGrid({});
      setBulkMessage({ text: '', type: 'info' });
    }
  }, [selectedStreamId, selectedSubjectId, students, scores]);

  // Handle cell value change + real-time validation
  const handleCellChange = (studentId: string, field: 'ca' | 'exam', value: string) => {
    // Only permit numbers and clear strings
    if (value !== '' && isNaN(Number(value))) return;

    setEditGrid(prev => {
      const current = { ...prev[studentId] };
      current[field] = value;

      const numVal = Number(value);
      let error = '';

      if (field === 'ca' && (numVal < 0 || numVal > 30)) {
        error = 'CA must be between 0 and 30';
      } else if (field === 'exam' && (numVal < 0 || numVal > 70)) {
        error = 'Exam must be between 0 and 70';
      }

      current.error = error;
      return { ...prev, [studentId]: current };
    });
  };

  // Submit score for a single student row
  const handleSaveRow = (studentId: string) => {
    const studentInputs = editGrid[studentId];
    if (!studentInputs) return;

    const caVal = Number(studentInputs.ca);
    const examVal = Number(studentInputs.exam);

    // Validation guard rules
    if (caVal < 0 || caVal > 30 || examVal < 0 || examVal > 70) {
      setEditGrid(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], error: 'Verify CA & exam bounds.' }
      }));
      return;
    }

    const total = caVal + examVal;
    const { grade } = calculateGradeAndRemark(total, gradeBoundaries);

    // Enforce on-disk relational upsert to database mapping
    onUpsertScore({
      studentId,
      subjectId: selectedSubjectId,
      continuousAssessment: caVal,
      exam: examVal,
      total,
      grade,
      updatedAt: new Date().toISOString()
    });

    setEditGrid(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], error: '' }
    }));
    
    // Quick row feedback
    setBulkMessage({ text: `Score synchronized successfully.`, type: 'success' });
  };

  // Bulk process entire scoring directory
  const handleSaveAll = () => {
    // Audit grid for validating errors
    let hasValidationErrors = false;
    const updates: Omit<Score, 'id'>[] = [];

    activeStreamStudents.forEach(st => {
      const inputs = editGrid[st.id];
      if (!inputs) return;

      const caVal = Number(inputs.ca);
      const examVal = Number(inputs.exam);

      if (caVal < 0 || caVal > 30 || examVal < 0 || examVal > 70) {
        hasValidationErrors = true;
        setEditGrid(prev => ({
          ...prev,
          [st.id]: { ...prev[st.id], error: 'Out of bounds. Double check inputs.' }
        }));
      } else {
        const total = caVal + examVal;
        const { grade } = calculateGradeAndRemark(total, gradeBoundaries);
        
        updates.push({
          studentId: st.id,
          subjectId: selectedSubjectId,
          continuousAssessment: caVal,
          exam: examVal,
          total,
          grade,
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (hasValidationErrors) {
      setBulkMessage({ text: 'Some scores failed validation. Please review red columns.', type: 'error' });
      return;
    }

    onBatchUpsertScores(updates);
    setBulkMessage({ text: `Synchronized ${updates.length} students grades atomically to ledger.`, type: 'success' });
  };

  // Statistics calculation for selected subject
  const getSubjectStats = () => {
    const matchedScores = scores.filter(s => s.subjectId === selectedSubjectId && 
      students.some(st => st.id === s.studentId && st.streamId === selectedStreamId && st.status === 'Active')
    );

    if (matchedScores.length === 0) return null;

    const totalCand = matchedScores.length;
    const scoresSum = matchedScores.reduce((acc, curr) => acc + curr.total, 0);
    const average = Number((scoresSum / totalCand).toFixed(1));
    const highest = Math.max(...matchedScores.map(m => m.total));
    const lowest = Math.min(...matchedScores.map(m => m.total));
    const passes = matchedScores.filter(m => m.total >= 50).length;
    const passRate = Number(((passes / totalCand) * 100).toFixed(0));

    // Compile distributions
    const ranges = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    matchedScores.forEach(m => {
      ranges[m.grade as keyof typeof ranges] = (ranges[m.grade as keyof typeof ranges] || 0) + 1;
    });

    return { totalCand, average, highest, lowest, passRate, ranges };
  };

  const stats = getSubjectStats();

  return (
    <div className="space-y-6" id="gradebook_module">
      {/* Header bar */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PencilLine className="text-indigo-600" size={24} />
          Digital Assessment Gradebook
        </h2>
        <p className="text-xs text-slate-500 font-sans">
          Log Continuous Assessment (30%) and Examination (70%) ratios. Changes recalculate school rankings instantly.
        </p>
      </div>

      {/* Grid Target Selectors */}
      <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Target Class Stream</label>
          <select
            value={selectedStreamId}
            onChange={e => {
              setSelectedStreamId(e.target.value);
              setSelectedSubjectId(''); // reset subject scope
            }}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
            id="gradebook_select_stream"
          >
            <option value="">-- Choose Class Stream --</option>
            {streams.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Target Subject Offered</label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            disabled={!selectedStreamId}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-sans"
            id="gradebook_select_subject"
          >
            <option value="">-- Choose Subject Course --</option>
            {activeStreamSubjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
            ))}
          </select>
        </div>

        {selectedStreamId && activeStreamSubjects.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-1 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2.5 text-xs text-rose-700">
            <ShieldAlert size={16} />
            <span>This stream has no assigned subjects yet. Configure subjects first.</span>
          </div>
        )}
      </div>

      {/* Main Grid Render Context */}
      {selectedStreamId && selectedSubjectId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left panel: Scoring sheet */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-mono text-slate-500">
                Candidates: <strong>{activeStreamStudents.length} Students active</strong>
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleLoadGrid}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
                  title="Reload Gradebook"
                >
                  <RefreshCw size={12} />
                  Restore Grid
                </button>
                <button
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                  id="gradebook_btn_submit_all"
                >
                  <Save size={12} />
                  Apply Batch Grades
                </button>
              </div>
            </div>

            {/* Notification logs */}
            {bulkMessage.text && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
                bulkMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                bulkMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50/50 text-indigo-700 border-indigo-250 border-indigo-200'
              }`}>
                <CheckSquare size={14} />
                <span>{bulkMessage.text}</span>
              </div>
            )}

            {/* Editing grid */}
            <div className="overflow-x-auto bg-white border border-slate-150 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-1/3">Candidate Name</th>
                    <th className="py-2.5 px-3 text-center w-24">CA Score (0-30)</th>
                    <th className="py-2.5 px-3 text-center w-24">Exam Score (0-70)</th>
                    <th className="py-2.5 px-3 text-center w-20">Total (100)</th>
                    <th className="py-2.5 px-3 text-center w-16">Grade</th>
                    <th className="py-2.5 px-3 text-right">Row Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeStreamStudents.length > 0 ? (
                    activeStreamStudents.map(student => {
                      const input = editGrid[student.id] || { ca: '0', exam: '0', error: '' };
                      const totalComp = Number(input.ca) + Number(input.exam);
                      const { grade } = calculateGradeAndRemark(totalComp || 0, gradeBoundaries);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition" id={`scoring_row_${student.id}`}>
                          <td className="py-2 px-3">
                            <strong className="text-slate-900 block font-bold">{student.name}</strong>
                            <span className="text-[10px] font-mono text-slate-400">{student.admissionNo}</span>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <input
                              type="text"
                              value={input.ca}
                              onChange={e => handleCellChange(student.id, 'ca', e.target.value)}
                              className={`w-16 text-center font-mono py-1 px-1.5 border rounded focus:outline-none text-xs ${
                                input.error && input.error.includes('CA') ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 font-bold bg-rose-50 text-rose-700' : 'border-slate-200 focus:ring-1 focus:ring-indigo-500'
                              }`}
                              placeholder="0"
                              id={`input_ca_${student.id}`}
                            />
                          </td>

                          <td className="py-2 px-3 text-center">
                            <input
                              type="text"
                              value={input.exam}
                              onChange={e => handleCellChange(student.id, 'exam', e.target.value)}
                              className={`w-16 text-center font-mono py-1 px-1.5 border rounded focus:outline-none text-xs ${
                                input.error && input.error.includes('Exam') ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 font-bold bg-rose-50 text-rose-700' : 'border-slate-200 focus:ring-1 focus:ring-indigo-500'
                              }`}
                              placeholder="0"
                              id={`input_exam_${student.id}`}
                            />
                          </td>

                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                            {totalComp || 0}%
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded font-black text-[10px] bg-slate-900 text-white font-mono">
                              {grade}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleSaveRow(student.id)}
                              disabled={!!input.error}
                              className="p-1 px-2.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 disabled:opacity-40 rounded border border-indigo-150 bg-indigo-50/20 text-[10px] font-bold transition cursor-pointer"
                              id={`btn_save_row_${student.id}`}
                            >
                              Sync Student
                            </button>
                            {input.error && (
                              <p className="text-[9px] text-red-500 text-right mt-0.5">{input.error}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No active registered students enrolled in this stream.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right panel: Class Performance statistics & distribution */}
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <BarChart2 size={16} className="text-emerald-500" />
                Performance Analysis
              </h3>
              
              {stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Class Average</span>
                      <strong className="text-lg text-slate-800 font-bold">{stats.average}%</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Pass Rate (Avg &ge; 50)</span>
                      <strong className="text-lg text-emerald-600 font-bold">{stats.passRate}%</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Highest Score</span>
                      <strong className="text-lg text-slate-800 font-bold">{stats.highest}%</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">Lowest Score</span>
                      <strong className="text-lg text-slate-800 font-bold">{stats.lowest}%</strong>
                    </div>
                  </div>

                  {/* Density distribution ranges */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Grade Distribution Density</span>
                    <div className="space-y-1">
                      {Object.keys(stats.ranges).map(gr => {
                        const count = stats.ranges[gr as keyof typeof stats.ranges] || 0;
                        const pctComp = stats.totalCand > 0 ? (count / stats.totalCand) * 100 : 0;
                        return (
                          <div key={gr} className="flex items-center text-xs space-x-2">
                            <span className="w-5 font-bold font-mono text-slate-650">{gr}</span>
                            <div className="grow h-2 bg-slate-100 rounded overflow-hidden relative">
                              <div className="bg-indigo-500 h-full rounded" style={{ width: `${pctComp}%` }}></div>
                            </div>
                            <span className="w-8 font-mono text-right text-[10px] text-slate-500">{count} candidates</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6 italic">
                  No scores recorded for this course combination. Submit scores to compile performance distributions.
                </p>
              )}
            </div>

            {/* Instruction Warning */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-800 space-y-2 leading-relaxed">
              <strong className="block text-xs font-bold text-amber-900 flex items-center gap-1">
                <ShieldAlert size={14} />
                Double-Entry Rules Engine
              </strong>
              <p>
                To secure academic ledger records:
                1. Continuous Assessment (CA) scores and Exams are bounded to 30.00% and 70.00% respectively.
                2. Real-time grades and remark mappings compile upon save or batch submission.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* PROMPT DISPLAY ON EMPTY STATE */
        <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
          <Award size={32} className="text-slate-300" />
          <p className="text-xs font-medium">Please select a Class Stream and Course combination to load the performance gradebook grid.</p>
        </div>
      )}

    </div>
  );
}
