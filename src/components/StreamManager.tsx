/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stream, Student, Subject, StudentResultSummary } from '../types';
import { Layers, Plus, Search, MapPin, Sparkles, User, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';

interface StreamManagerProps {
  streams: Stream[];
  students: Student[];
  subjects: Subject[];
  results: StudentResultSummary[];
  onAddStream: (stream: Omit<Stream, 'id'>) => void;
  onViewStudentProfile: (studentId: string) => void;
}

export default function StreamManager({ streams, students, subjects, results, onAddStream, onViewStudentProfile }: StreamManagerProps) {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  
  // Create state for new stream form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamRoom, setNewStreamRoom] = useState('');
  const [newStreamTeacher, setNewStreamTeacher] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Handle stream submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName.trim() || !newStreamRoom.trim() || !newStreamTeacher.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    // Prevent duplicate stream names
    if (streams.some(st => st.name.toLowerCase() === newStreamName.trim().toLowerCase())) {
      setErrorMsg('A stream with this name already exists.');
      return;
    }

    onAddStream({
      name: newStreamName.trim(),
      roomNumber: newStreamRoom.trim(),
      classTeacher: newStreamTeacher.trim(),
    });

    // Reset Form
    setNewStreamName('');
    setNewStreamRoom('');
    setNewStreamTeacher('');
    setErrorMsg('');
    setShowAddForm(false);
  };

  const selectedStream = streams.find(st => st.id === selectedStreamId);
  
  // Filter streams
  const filteredStreams = streams.filter(st => {
    const q = searchQuery.toLowerCase();
    return st.name.toLowerCase().includes(q) || 
           st.classTeacher.toLowerCase().includes(q) || 
           st.roomNumber.toLowerCase().includes(q);
  });

  // Calculate stream-specific data for details
  const getStreamDetails = (streamId: string) => {
    // roster
    const streamStudents = students.filter(s => s.streamId === streamId);
    // stream-assigned subjects
    const assignedSubjects = subjects.filter(sub => sub.assignedStreamIds.includes(streamId));
    // summaries
    const streamResults = results.filter(r => r.streamId === streamId);
    
    // sorting results by position
    const sortedResults = [...streamResults].sort((a, b) => a.classPosition - b.classPosition);
    
    // Average
    const average = streamResults.length > 0
      ? Number((streamResults.reduce((acc, curr) => acc + curr.averageScore, 0) / streamResults.length).toFixed(1))
      : 0;

    return {
      students: streamStudents,
      subjects: assignedSubjects,
      results: sortedResults,
      average
    };
  };

  return (
    <div className="space-y-6" id="streams_module">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={22} className="text-indigo-600" />
            Class Stream Management
          </h2>
          <p className="text-xs text-slate-500">
            Define, enroll, and observe Ikonex Academy academic pipelines
          </p>
        </div>
        {!selectedStreamId && (
          <button
            id="btn_add_stream_modal"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-slate-100 rounded-lg text-sm font-medium transition cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            Create Stream
          </button>
        )}
      </div>

      {/* Conditional: Add Stream Form */}
      {showAddForm && !selectedStreamId && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm max-w-xl animate-fade-in" id="stream_register_form">
          <h3 className="text-sm font-bold text-slate-800 mb-3 block">New Class Stream Creation</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stream Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Form 1C" 
                value={newStreamName}
                onChange={e => setNewStreamName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="form_field_stream_name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Room Assignment *</label>
              <input 
                type="text" 
                placeholder="e.g. Room 103" 
                value={newStreamRoom}
                onChange={e => setNewStreamRoom(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="form_field_stream_room"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Class Teacher *</label>
              <input 
                type="text" 
                placeholder="e.g. Grace Muli" 
                value={newStreamTeacher}
                onChange={e => setNewStreamTeacher(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="form_field_stream_teacher"
              />
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-500 mb-3">{errorMsg}</p>}

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setErrorMsg(''); }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg cursor-pointer"
              id="btn_submit_stream"
            >
              Register Stream
            </button>
          </div>
        </form>
      )}

      {/* Main content toggle: List vs Detail */}
      {!selectedStreamId ? (
        /* STREAMS LIST VIEW */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search streams, teachers, rooms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="stream_search_input"
            />
          </div>

          {/* Grid of Streams */}
          {filteredStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStreams.map(st => {
                const { students: stStore, average } = getStreamDetails(st.id);
                return (
                  <div 
                    key={st.id} 
                    className="bg-white border border-slate-100 rounded-xl p-5 hover:border-indigo-100 hover:shadow-md transition duration-200 relative group flex flex-col justify-between"
                    id={`stream_card_${st.id}`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            STREAM ID: {st.id}
                          </span>
                          <h3 className="text-base font-bold text-slate-800">{st.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">
                            {average > 0 ? `${average}% Avg` : 'No Scores'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span>Adviser: <strong className="text-slate-700">{st.classTeacher}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span>Location: <strong className="text-slate-700">{st.roomNumber}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Roster count: <strong>{stStore.length} students</strong>
                      </span>
                      <button
                        onClick={() => setSelectedStreamId(st.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                        id={`btn_inspect_stream_${st.id}`}
                      >
                        Inspect Stream
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 p-8 rounded-xl text-center">
              <p className="text-xs text-slate-400">No matching streams found.</p>
            </div>
          )}
        </div>
      ) : (
        /* SINGLE STREAM DETAILS VIEW */
        <div className="space-y-6 animate-fade-in" id="stream_detail_view">
          {/* Back Action */}
          <button
            onClick={() => setSelectedStreamId(null)}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 cursor-pointer"
            id="btn_back_to_streams"
          >
            <ArrowLeft size={14} />
            Back to Streams Directory
          </button>

          {/* Stream Jumbotron details */}
          {selectedStream && (
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">{selectedStream.name} Details</h3>
                  <p className="text-xs text-slate-500">
                    Class Adviser: <span className="font-semibold text-slate-800">{selectedStream.classTeacher}</span> • Room: <span className="font-semibold text-slate-800">{selectedStream.roomNumber}</span>
                  </p>
                </div>
                {/* Aggregate indicators */}
                <div className="flex gap-4">
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-mono text-slate-400">Stream Average</span>
                    <strong className="text-lg text-indigo-600">{getStreamDetails(selectedStream.id).average}%</strong>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-center">
                    <span className="block text-[10px] uppercase font-mono text-slate-400">Enrollment</span>
                    <strong className="text-lg text-indigo-600">{getStreamDetails(selectedStream.id).students.length}</strong>
                  </div>
                </div>
              </div>

              {/* Two Panel Layout: Student performanc list (Left) and Assigned subjects (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Left Panel: Stream Student Performance list */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Student Rankings (Stream Leaderboard)</h4>
                  
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                          <th className="py-2.5 px-3">Position</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Admission ID</th>
                          <th className="py-2.5 px-3">Avg Score</th>
                          <th className="py-2.5 px-3">Overall Grade</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {getStreamDetails(selectedStream.id).results.length > 0 ? (
                          getStreamDetails(selectedStream.id).results.map((r, idx) => {
                            const originalStudent = students.find(s => s.id === r.studentId);
                            const statusColor = r.averageScore >= 80 ? 'bg-green-50 text-green-700' : r.averageScore >= 50 ? 'bg-cyan-50 text-cyan-700' : 'bg-rose-50 text-rose-700';
                            return (
                              <tr key={r.studentId} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-3 font-bold text-slate-600">
                                  #{r.classPosition}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-800">
                                  {r.studentName}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-500">
                                  {r.admissionNo}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${statusColor}`}>
                                    {r.averageScore}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-700">
                                  {r.overallGrade}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    originalStudent?.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {originalStudent?.status || 'Active'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => onViewStudentProfile(r.studentId)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center justify-end gap-1 ml-auto"
                                    id={`lnk_stream_profile_${r.studentId}`}
                                  >
                                    Report Card
                                    <ExternalLink size={10} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400">
                              No rankings loaded for this stream yet. Record scores for this stream first.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Panel: Assigned Subjects */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assigned Subjects Menu ({getStreamDetails(selectedStream.id).subjects.length})</h4>
                  
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 space-y-3">
                    {getStreamDetails(selectedStream.id).subjects.length > 0 ? (
                      getStreamDetails(selectedStream.id).subjects.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 block">{sub.code}</span>
                            <span className="text-xs font-semibold text-slate-755 text-slate-700">{sub.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded font-medium">
                            {sub.department}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">
                        No subjects assigned to this stream yet. Go to Subject Management to configure relationships.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
