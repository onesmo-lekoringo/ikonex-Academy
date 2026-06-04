/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Subject, Stream } from '../types';
import { BookOpen, Plus, Tag, Layers, Trash2, Edit2, AlertCircle, Save } from 'lucide-react';

interface SubjectManagerProps {
  subjects: Subject[];
  streams: Stream[];
  onAddSubject: (subject: Omit<Subject, 'id'>) => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
}

export default function SubjectManager({
  subjects,
  streams,
  onAddSubject,
  onEditSubject,
  onDeleteSubject
}: SubjectManagerProps) {
  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [department, setDepartment] = useState('Sciences');
  const [assignedStreamIds, setAssignedStreamIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit action
  const handleEditClick = (subj: Subject) => {
    setEditingSubject(subj);
    setName(subj.name);
    setCode(subj.code);
    setDepartment(subj.department);
    setAssignedStreamIds(subj.assignedStreamIds);
    setShowAddForm(true);
    setErrorMsg('');
  };

  // Toggle Stream assignment helper
  const handleToggleStream = (streamId: string) => {
    if (assignedStreamIds.includes(streamId)) {
      setAssignedStreamIds(assignedStreamIds.filter(id => id !== streamId));
    } else {
      setAssignedStreamIds([...assignedStreamIds, streamId]);
    }
  };

  // Reset Fields
  const resetForm = () => {
    setName('');
    setCode('');
    setDepartment('Sciences');
    setAssignedStreamIds([]);
    setEditingSubject(null);
    setShowAddForm(false);
    setErrorMsg('');
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !department) {
      setErrorMsg('All fields marked with an asterisk (*) are required.');
      return;
    }

    // Code Unique Validation (excluding current being edited)
    const isCodeDuplicate = subjects.some(s => s.code.toLowerCase() === code.trim().toLowerCase() && s.id !== editingSubject?.id);
    if (isCodeDuplicate) {
      setErrorMsg('A subject with this curricular code already exists.');
      return;
    }

    if (editingSubject) {
      onEditSubject({
        ...editingSubject,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department,
        assignedStreamIds
      });
    } else {
      onAddSubject({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department,
        assignedStreamIds
      });
    }

    resetForm();
  };

  return (
    <div className="space-y-6" id="subject_manager_module">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={22} className="text-indigo-600" />
            Curriculum & Subject Alignment
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Add subject definitions, view active disciplines, and align them to individual class streams
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-sm font-medium transition cursor-pointer self-start sm:self-auto"
          id="btn_add_subject_toggle"
        >
          {showAddForm ? 'Close Curriculum Form' : 'Add Subject Code'}
        </button>
      </div>

      {/* Subject Creator Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm max-w-2xl animate-fade-in" id="subject_form">
          <h3 className="text-sm font-bold text-slate-800 mb-3 block">
            {editingSubject ? `Update Subject: ${editingSubject.code}` : 'Register New Academic Discipline'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subject Name *</label>
              <input
                type="text"
                placeholder="e.g. Computer Studies"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                id="field_subject_name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subject Code *</label>
              <input
                type="text"
                placeholder="e.g. COMP105"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                id="field_subject_code"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">School Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                id="field_subject_dept"
              >
                <option value="Sciences">Sciences</option>
                <option value="Languages">Languages</option>
                <option value="Humanities">Humanities</option>
                <option value="Arts">Vocational & Arts</option>
              </select>
            </div>
          </div>

          {/* Assigned Stream ids */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5 block">
              Align / Map to Class Streams (Select all applicable) *
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {streams.map(st => {
                const isSelected = assignedStreamIds.includes(st.id);
                return (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => handleToggleStream(st.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    id={`btn_toggle_subject_stream_${st.id}`}
                  >
                    <Layers size={12} />
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-500 mb-3">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
              id="btn_save_subject"
            >
              <Save size={13} />
              {editingSubject ? 'Save Changes' : 'Align Subject'}
            </button>
          </div>
        </form>
      )}

      {/* Viewing all Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="subject_directory_grid">
        {subjects.map(subj => {
          // Find stream names mapped
          const mappedStreamNames = streams
            .filter(st => subj.assignedStreamIds.includes(st.id))
            .map(st => st.name);

          return (
            <div
              key={subj.id}
              className="bg-white border border-slate-150 rounded-xl p-5 hover:shadow-sm duration-200 flex flex-col justify-between"
              id={`subject_card_${subj.id}`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold block bg-slate-50 border border-slate-100 px-2 py-0.5 rounded w-max">
                      {subj.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 mt-1">{subj.name}</h3>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                    {subj.department}
                  </span>
                </div>

                {/* Stream mappings */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Mapped Streams</span>
                  <div className="flex flex-wrap gap-1">
                    {mappedStreamNames.length > 0 ? (
                      mappedStreamNames.map((name, i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100 text-[10px] font-medium">
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] italic text-slate-400">No aligned streams. Blocked from scoring.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Action list */}
              <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Disciplines assigned: <strong>{subj.assignedStreamIds.length} streams</strong>
                </span>

                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    onClick={() => handleEditClick(subj)}
                    className="p-1 hover:text-indigo-600 transition"
                    title="Edit Course Code"
                    id={`btn_edit_course_${subj.id}`}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you absolutely sure you want to delete this course: ${subj.name} (${subj.code})? This will unalign it and archive all scoring reports.`)) {
                        onDeleteSubject(subj.id);
                      }
                    }}
                    className="p-1 hover:text-rose-600 transition"
                    title="Delete Course Code"
                    id={`btn_delete_course_${subj.id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
