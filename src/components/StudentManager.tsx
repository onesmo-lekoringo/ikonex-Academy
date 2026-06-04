/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stream, Student, Subject, StudentResultSummary } from '../types';
import { GraduationCap, Plus, Search, Filter, Edit2, Trash2, Calendar, FileText, ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  streams: Stream[];
  results: StudentResultSummary[];
  onAddStudent: (student: Omit<Student, 'id' | 'admissionNo'>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  selectedStudentProfileId: string | null;
  setSelectedStudentProfileId: (id: string | null) => void;
}

export default function StudentManager({
  students,
  streams,
  results,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  selectedStudentProfileId,
  setSelectedStudentProfileId
}: StudentManagerProps) {
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [streamId, setStreamId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Student['gender']>('Female');
  const [status, setStatus] = useState<Student['status']>('Active');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Search and Filter State
  const [searchText, setSearchText] = useState('');
  const [filterStreamId, setFilterStreamId] = useState('ALL');

  // Handle Edit click
  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setStreamId(student.streamId);
    setDob(student.dob);
    setGender(student.gender);
    setStatus(student.status);
    setParentName(student.parentName);
    setParentPhone(student.parentPhone);
    setShowForm(true);
    setFormError('');
  };

  // Reset form
  const resetFormState = () => {
    setName('');
    setStreamId(streams[0]?.id || '');
    setDob('2013-01-01');
    setGender('Female');
    setStatus('Active');
    setParentName('');
    setParentPhone('');
    setEditingStudent(null);
    setShowForm(false);
    setFormError('');
  };

  // Handle Submit (register or edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !streamId || !dob || !parentName.trim() || !parentPhone.trim()) {
      setFormError('All asterisked (*) fields are required.');
      return;
    }

    if (editingStudent) {
      onEditStudent({
        ...editingStudent,
        name: name.trim(),
        streamId,
        dob,
        gender,
        status,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim()
      });
    } else {
      onAddStudent({
        name: name.trim(),
        streamId,
        dob,
        gender,
        status,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim()
      });
    }

    resetFormState();
  };

  // Filter student registry list
  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          st.admissionNo.toLowerCase().includes(searchText.toLowerCase());
    const matchesStream = filterStreamId === 'ALL' || st.streamId === filterStreamId;
    return matchesSearch && matchesStream;
  });

  // Get active profile summaries
  const studentResult = results.find(r => r.studentId === selectedStudentProfileId);
  const selectedStudentData = students.find(s => s.id === selectedStudentProfileId);
  const selectedStudentStream = streams.find(st => st.id === selectedStudentData?.streamId);

  // Generate Automated Principal/Adviser Remarks
  const getPrincipalRemark = (avg: number) => {
    if (avg >= 85) return "Exceptinal work ethic. Amara continues to display brilliant leadership and absolute academic mastery. Highly commended!";
    if (avg >= 75) return "A very steady, highly impressive performance. Outstanding focus and dedication across core disciplines.";
    if (avg >= 60) return "Sufficient, solid academic progress. Shows good capability; could aim for higher marks with consistent practice.";
    if (avg >= 50) return "Passable results this term. Requires more diligent revisions in sciences and structured exercises.";
    if (avg > 0) return "Academic recovery required. Recommend urgent consultation with subject teachers for focused remedial sessions.";
    return "No grades registered or computed yet. Attendance and records stable.";
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;
      
      const element = document.getElementById('official_report_card_sheet');
      if (!element) {
        alert('Could not find report card element.');
        return;
      }
      
      const btn = document.getElementById('btn_download_report_card_pdf');
      if (btn) {
        btn.setAttribute('disabled', 'true');
        btn.innerText = 'Generating PDF...';
      }
      
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
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
      
      const fileName = `ReportCard_${selectedStudentData?.name.replace(/\s+/g, '_')}_${selectedStudentData?.admissionNo}.pdf`;
      pdf.save(fileName);
      
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> Download PDF Report Card`;
      }
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert(`PDF Export Failed: ${err.message}`);
      const btn = document.getElementById('btn_download_report_card_pdf');
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> Download PDF Report Card`;
      }
    }
  };

  return (
    <div className="space-y-6" id="student_manager_module">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="text-indigo-600" size={24} />
            Student Core Registry
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Enroll, audit student folders, print academic records, and check tuition/adviser status
          </p>
        </div>
        {!selectedStudentProfileId && (
          <button
            onClick={() => {
              if (showForm) resetFormState();
              else {
                setShowForm(true);
                // default values
                setStreamId(streams[0]?.id || '');
                setDob('2013-01-01');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-sm font-medium transition cursor-pointer self-start sm:self-auto"
            id="btn_enroll_student_toggle"
          >
            {showForm ? 'Close Registry Form' : 'Enroll New Student'}
          </button>
        )}
      </div>

      {/* Enroll Form */}
      {showForm && !selectedStudentProfileId && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm max-w-4xl animate-fade-in" id="student_form">
          <h3 className="text-sm font-bold text-slate-800 mb-4 block">
            {editingStudent ? `Update Folder for ${editingStudent.name}` : 'Student Enrollment Dossier'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Full Student Name *</label>
              <input
                type="text"
                placeholder="e.g. Johnathan Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="field_student_name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Primary Stream Assignment *</label>
              <select
                value={streamId}
                onChange={e => setStreamId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="field_student_stream"
              >
                {streams.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date of Birth *</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="field_student_dob"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Identified Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as Student['gender'])}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status Code</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Student['status'])}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Parent/Guardian Name *</label>
              <input
                type="text"
                placeholder="e.g. Richard Doe"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="field_parent_name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Guardians Phone Number *</label>
              <input
                type="text"
                placeholder="e.g. +1 555-1234"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="field_parent_phone"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetFormState}
              className="px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg cursor-pointer"
              id="btn_save_student"
            >
              <Save size={14} />
              {editingStudent ? 'Synchronize Record' : 'Log Enrollment'}
            </button>
          </div>
        </form>
      )}

      {/* Conditonal Toggle: List vs Report Card */}
      {!selectedStudentProfileId ? (
        /* REGISTRY STUDENT TABLE LIST */
        <div className="space-y-4">
          
          {/* Controls: Search and Stream Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                placeholder="Search students by name, admission ID..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="input_search_students"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={filterStreamId}
                onChange={e => setFilterStreamId(e.target.value)}
                className="w-full sm:w-auto text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                id="select_filter_student_stream"
              >
                <option value="ALL">All Class Streams</option>
                {streams.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster list */}
          <div className="overflow-x-auto bg-white border border-slate-150 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-4">Admission ID</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Class Stream</th>
                  <th className="py-2.5 px-4">Gender</th>
                  <th className="py-2.5 px-4">Parent / Phone</th>
                  <th className="py-2.5 px-4">Academic Avg</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const stStreamObj = streams.find(st => st.id === student.streamId);
                    const perfObj = results.find(r => r.studentId === student.id);
                    const hasScores = perfObj && perfObj.averageScore > 0;
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition" id={`row_student_${student.id}`}>
                        <td className="py-3 px-4 font-mono font-medium text-slate-650 text-slate-700">
                          {student.admissionNo}
                        </td>
                        <td className="py-3 px-4">
                          <span 
                            onClick={() => setSelectedStudentProfileId(student.id)} 
                            className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition block"
                          >
                            {student.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {stStreamObj ? stStreamObj.name : 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {student.gender}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] leading-tight">
                          <div>{student.parentName}</div>
                          <div className="font-mono text-slate-400">{student.parentPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          {hasScores ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-bold ${
                              perfObj.averageScore >= 80 ? 'bg-green-50 text-green-700' : perfObj.averageScore >= 50 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {perfObj.averageScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No Scores</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            student.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : student.status === 'Suspended' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => setSelectedStudentProfileId(student.id)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
                              title="Inspect Performance Dossier"
                              id={`btn_report_card_${student.id}`}
                            >
                              <FileText size={15} />
                            </button>
                            <button
                              onClick={() => handleEditClick(student)}
                              className="p-1 text-slate-500 hover:text-amber-600 rounded transition cursor-pointer"
                              title="Edit Folder"
                              id={`btn_edit_student_${student.id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you absolutely sure you want to completely delete student: ${student.name}? Associated grades will be archived.`)) {
                                  onDeleteStudent(student.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete Folder"
                              id={`btn_delete_student_${student.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">
                      No student listings found matching query bounds. Use 'Enroll New Student' above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* OFFICIAL REPORT CARD VISUAL DOSSIER SCREEN */
        <div className="space-y-6 animate-fade-in" id="student_report_card_view">
          
          {/* Back Action & PDF download */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              onClick={() => setSelectedStudentProfileId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer"
              id="btn_back_to_registry"
            >
              <ArrowLeft size={14} />
              Back to Registry List
            </button>
            
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto shadow-xs"
              id="btn_download_report_card_pdf"
            >
              <FileText size={14} />
              Download PDF Report Card
            </button>
          </div>

          {/* Academic Report Card Sheet */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-md relative overflow-hidden" id="official_report_card_sheet">
            {/* Aesthetic watermarks */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-slate-50 rounded-full translate-x-12 -translate-y-12 opacity-40 border border-slate-100 flex items-center justify-center font-bold font-serif text-[100px] text-slate-300 pointer-events-none select-none">
              A
            </div>

            {/* Academy Header */}
            <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1.5 relative">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider block uppercase font-mono">Official Academic Performance Record</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif leading-none tracking-tight">IKONEX ACADEMY</h1>
              <p className="text-xs text-slate-500">P.O. Box 709, Academy Road • Standardized Terminal Assessment Sheet</p>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-[10px] font-mono font-bold mt-2">
                ACADEMIC SESSION: 2026/2027 • FIRST TERM
              </div>
            </div>

            {/* Student Folder Metadata Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 bg-slate-50 border border-slate-250 rounded-lg text-xs" id="report_metadata_grid">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">STUDENT NAME</span>
                  <strong className="text-sm text-slate-800 font-bold block">{selectedStudentData?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">ADMISSION NO</span>
                  <strong className="font-mono text-slate-800 font-semibold block">{selectedStudentData?.admissionNo}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">DATE OF BIRTH</span>
                  <span className="font-semibold text-slate-800 block flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {selectedStudentData?.dob}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">CLASS STREAM</span>
                  <strong className="text-sm text-slate-800 block">{selectedStudentStream ? selectedStudentStream.name : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">CLASS ADVISER</span>
                  <span className="font-medium text-slate-800 block">{selectedStudentStream ? selectedStudentStream.classTeacher : 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[9px]">BIOLOGICAL GENDER</span>
                  <span className="font-semibold text-slate-800 block">{selectedStudentData?.gender}</span>
                </div>
              </div>
            </div>

            {/* Detailed Grade Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1">Course Scores Breakdown</h3>
              
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                      <th className="py-2 px-3">Subject ID</th>
                      <th className="py-2 px-3">Subject Name</th>
                      <th className="py-2 px-3 text-center">CA (Max 30)</th>
                      <th className="py-2 px-3 text-center">Exam (Max 70)</th>
                      <th className="py-2 px-3 text-center">Total (100)</th>
                      <th className="py-2 px-3 text-center">Grade</th>
                      <th className="py-2 px-3">Remark Achievement</th>
                      <th className="py-2 px-3 text-right">Roster Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {studentResult && Object.keys(studentResult.subjectResults).length > 0 ? (
                      Object.keys(studentResult.subjectResults).map(subjId => {
                        const scoreInfo = studentResult.subjectResults[subjId];
                        return (
                          <tr key={subjId} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">
                              {scoreInfo.subjectCode}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {scoreInfo.subjectName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {scoreInfo.ca}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {scoreInfo.exam}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                              {scoreInfo.total}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white font-mono">
                                {scoreInfo.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-600">
                              {scoreInfo.remark}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                              #{scoreInfo.subjectPosition} / {scoreInfo.totalStudentsInSubject}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-slate-400 italic">
                          No assessment reports registered for this student folder yet. Check gradebook.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary KPI Panel inside Report Card */}
            {studentResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t-2 border-slate-900 pt-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-[9px] font-mono text-slate-400">GRAND TOTALS</span>
                  <strong className="text-lg xl:text-xl text-slate-800">{studentResult.totalMarks} Marks</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-[9px] font-mono text-slate-400">AVERAGE SCORE</span>
                  <strong className="text-lg xl:text-xl text-indigo-600">{studentResult.averageScore}%</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-[9px] font-mono text-slate-400">CUMULATIVE GRADE</span>
                  <strong className="text-lg xl:text-xl text-slate-800 font-black">{studentResult.overallGrade}</strong>
                </div>
                <div className="bg-slate-900 text-white p-3 rounded-lg text-center">
                  <span className="block text-[9px] font-mono text-slate-400">STREAM RANK</span>
                  <strong className="text-lg xl:text-xl text-teal-400 font-bold">#{studentResult.classPosition} / {studentResult.totalStudentsInClass}</strong>
                </div>
              </div>
            )}

            {/* Principal Signature and Automated Comment */}
            {studentResult && (
              <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="md:col-span-2 space-y-1">
                  <span className="font-bold text-slate-800 block">Class Advisers Remarks & Principal Overview:</span>
                  <p className="italic text-slate-500 bg-slate-50/50 p-3 rounded-lg border border-slate-100 leading-relaxed text-[11px]">
                    "{getPrincipalRemark(studentResult.averageScore)}"
                  </p>
                </div>
                <div className="flex flex-col justify-end items-center border border-slate-200 p-4 rounded-lg bg-slate-50/50">
                  <span className="text-[10px] font-bold text-indigo-600 block leading-none select-none italic font-serif">Ikonex Registry Registrar</span>
                  <div className="w-24 h-0.5 bg-slate-300 my-2"></div>
                  <strong className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">OFFICIAL REGISTER</strong>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
