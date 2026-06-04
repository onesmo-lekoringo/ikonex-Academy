/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Stream, Student, Subject, Score, GradeBoundary } from './types';
import { 
  INITIAL_STREAMS, 
  INITIAL_STUDENTS, 
  INITIAL_SUBJECTS, 
  INITIAL_SCORES, 
  DEFAULT_GRADE_BOUNDARIES, 
  processResults 
} from './data/mockData';

// Component Imports
import Dashboard from './components/Dashboard';
import StreamManager from './components/StreamManager';
import StudentManager from './components/StudentManager';
import SubjectManager from './components/SubjectManager';
import Gradebook from './components/Gradebook';
import Rankings from './components/Rankings';
import DatabaseViewer from './components/DatabaseViewer';

// Icon imports
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  BookOpen, 
  PencilLine, 
  Trophy, 
  Database,
  GraduationCap
} from 'lucide-react';

export default function App() {
  // 1. Backend API State core setup
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [gradeBoundaries, setGradeBoundaries] = useState<GradeBoundary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI Active Section Tab Selection
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Highlighting specific student report card
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null);

  // Load all system data from the PostgreSQL backend on startup
  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/all');
        if (!res.ok) throw new Error('Failed to load database records from server.');
        const data = await res.json();
        setStreams(data.streams);
        setStudents(data.students);
        setSubjects(data.subjects);
        setScores(data.scores);
        setGradeBoundaries(data.gradeBoundaries);
        setError(null);
      } catch (err: any) {
        console.error('Error loading API payload:', err);
        setError(err.message || 'Could not connect to the Express server.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Data Action Handlers communicating with Express Backend

  // ADD Stream
  const handleAddStream = async (newStream: Omit<Stream, 'id'>) => {
    try {
      const id = `str_${Date.now()}`;
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStream, id })
      });
      if (!res.ok) throw new Error('Failed to add stream to database.');
      const added = await res.json();
      setStreams(prev => [...prev, added]);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ADD Student
  const handleAddStudent = async (newStudent: Omit<Student, 'id' | 'admissionNo'>) => {
    try {
      const year = new Date().getFullYear();
      let ordinal = students.length + 1;
      let admissionNo = `IXA-${year}-${String(ordinal).padStart(3, '0')}`;
      
      // Ensure uniqueness
      while (students.some(s => s.admissionNo === admissionNo)) {
        ordinal++;
        admissionNo = `IXA-${year}-${String(ordinal).padStart(3, '0')}`;
      }

      const id = `std_${Date.now()}`;
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStudent, id, admissionNo })
      });
      if (!res.ok) throw new Error('Failed to create student record.');
      const added = await res.json();
      setStudents(prev => [...prev, added]);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // EDIT Student
  const handleEditStudent = async (edited: Student) => {
    try {
      const res = await fetch(`/api/students/${edited.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edited)
      });
      if (!res.ok) throw new Error('Failed to update student record.');
      const updated = await res.json();
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // DELETE Student
  const handleDeleteStudent = async (studentId: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete student record.');
      
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setScores(prev => prev.filter(sc => sc.studentId !== studentId));

      if (selectedStudentProfileId === studentId) {
        setSelectedStudentProfileId(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ADD Subject
  const handleAddSubject = async (newSubject: Omit<Subject, 'id'>) => {
    try {
      const id = `subj_${Date.now()}`;
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubject, id })
      });
      if (!res.ok) throw new Error('Failed to create curriculum subject.');
      const added = await res.json();
      setSubjects(prev => [...prev, added]);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // EDIT Subject
  const handleEditSubject = async (edited: Subject) => {
    try {
      const res = await fetch(`/api/subjects/${edited.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edited)
      });
      if (!res.ok) throw new Error('Failed to update subject details.');
      const updated = await res.json();
      setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // DELETE Subject
  const handleDeleteSubject = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete subject.');
      
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      setScores(prev => prev.filter(sc => sc.subjectId !== subjectId));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // UPSERT Score (Write transactional single grade)
  const handleUpsertScore = async (newScore: Omit<Score, 'id'>) => {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScore)
      });
      if (!res.ok) throw new Error('Failed to save score.');
      const upserted = await res.json();
      setScores(prev => {
        const filtered = prev.filter(sc => sc.id !== upserted.id);
        return [...filtered, upserted];
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // BATCH UPSERT Scores
  const handleBatchUpsertScores = async (updatesList: Omit<Score, 'id'>[]) => {
    try {
      const res = await fetch('/api/scores/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatesList)
      });
      if (!res.ok) throw new Error('Failed to batch save grades.');
      
      const keysMap = new Set(updatesList.map(u => `${u.studentId}_${u.subjectId}`));
      setScores(prev => {
        const filtered = prev.filter(sc => !keysMap.has(sc.id));
        const newItems = updatesList.map(u => ({
          ...u,
          id: `${u.studentId}_${u.subjectId}`,
          continuousAssessment: Number(u.continuousAssessment),
          exam: Number(u.exam),
          total: Number(u.total)
        }));
        return [...filtered, ...newItems];
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // UPDATE Configurable range boundaries
  const handleUpdateBoundaries = async (newBoundaries: GradeBoundary[]) => {
    try {
      const res = await fetch('/api/grade-boundaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBoundaries)
      });
      if (!res.ok) throw new Error('Failed to update grading boundaries.');
      
      setGradeBoundaries(newBoundaries);
      setScores(prev => {
        return prev.map(sc => {
          const boundary = newBoundaries.find(b => sc.total >= b.min && sc.total <= b.max);
          return {
            ...sc,
            grade: boundary ? boundary.grade : 'F'
          };
        });
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // FORCE recalculations utility (re-fetches from database to ensure local state sync)
  const handleRefreshCalculations = async () => {
    try {
      const res = await fetch('/api/all');
      if (!res.ok) throw new Error('Failed to load database records');
      const data = await res.json();
      setStreams(data.streams);
      setStudents(data.students);
      setSubjects(data.subjects);
      setScores(data.scores);
      setGradeBoundaries(data.gradeBoundaries);
    } catch (err: any) {
      console.error(err);
    }
  };

  // 3. Dynamic Memo Processor: Joins & Rankings Calculation
  const processedResults = useMemo(() => {
    return processResults(students, streams, subjects, scores, gradeBoundaries);
  }, [students, streams, subjects, scores, gradeBoundaries]);

  // Sidebar Tabs Config
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'streams', label: 'Class Streams', icon: Layers },
    { id: 'students', label: 'Student Folder', icon: Users },
    { id: 'subjects', label: 'Curriculum', icon: BookOpen },
    { id: 'gradebook', label: 'Scoring Grid', icon: PencilLine },
    { id: 'rankings', label: 'Rankings Engine', icon: Trophy },
    { id: 'database', label: 'SQL Terminal', icon: Database },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 antialiased font-sans" id="loading_screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Ikonex Academy</h2>
          <p className="text-xs text-slate-400 font-mono animate-pulse">Initializing Postgres Database Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 antialiased font-sans p-6" id="error_screen">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold font-mono">!</div>
          <h2 className="text-lg font-bold text-white">Database Connection Failed</h2>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer text-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans" id="app_root_frame">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 shrink-0 md:min-h-screen flex flex-col justify-between" id="app_sidebar">
        
        <div>
          {/* Logo brand */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">I</div>
            <span className="text-white font-bold text-lg tracking-tight">Ikonex Academy</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1" id="sidebar_nav">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav_link_${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedStudentProfileId(null); // clear inner profile lookups
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administrator profile in footer */}
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm font-mono select-none">
              LA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 truncate">lekoringoeliakim</p>
              <p className="text-sm font-semibold text-white truncate">Administrator</p>
            </div>
          </div>
        </div>

      </aside>

      {/* Main viewport area */}
      <main className="grow flex flex-col min-w-0" id="main_viewport">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0" id="app_header">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Current Module:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 tracking-tight border border-indigo-100">
              {sidebarItems.find(i => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium text-slate-500">
            <div className="hidden sm:block text-right">
              <span className="block font-bold text-slate-700">lekoringoeliakim</span>
              <span className="text-[10px] text-slate-400 block font-mono">lekoringoeliakim@gmail.com</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 border border-slate-300 select-none">
              LA
            </div>
          </div>
        </header>

        {/* Context panel wrapper */}
        <div className="grow p-6 overflow-y-auto max-w-7xl w-full mx-auto" id="app_view_container">
          
          {activeTab === 'dashboard' && (
            <Dashboard 
              students={students}
              streams={streams}
              subjects={subjects}
              results={processedResults}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setSelectedStudentProfileId(null);
              }}
            />
          )}

          {activeTab === 'streams' && (
            <StreamManager 
              streams={streams}
              students={students}
              subjects={subjects}
              results={processedResults}
              onAddStream={handleAddStream}
              onViewStudentProfile={(id) => {
                setSelectedStudentProfileId(id);
                setActiveTab('students');
              }}
            />
          )}

          {activeTab === 'students' && (
            <StudentManager 
              students={students}
              streams={streams}
              results={processedResults}
              onAddStudent={handleAddStudent}
              onEditStudent={handleEditStudent}
              onDeleteStudent={handleDeleteStudent}
              selectedStudentProfileId={selectedStudentProfileId}
              setSelectedStudentProfileId={setSelectedStudentProfileId}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectManager 
              subjects={subjects}
              streams={streams}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
            />
          )}

          {activeTab === 'gradebook' && (
            <Gradebook 
              streams={streams}
              students={students}
              subjects={subjects}
              scores={scores}
              gradeBoundaries={gradeBoundaries}
              onUpsertScore={handleUpsertScore}
              onBatchUpsertScores={handleBatchUpsertScores}
            />
          )}

          {activeTab === 'rankings' && (
            <Rankings 
              streams={streams}
              students={students}
              results={processedResults}
              gradeBoundaries={gradeBoundaries}
              onUpdateBoundaries={handleUpdateBoundaries}
              onRefreshCalculations={handleRefreshCalculations}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseViewer 
              students={students}
              streams={streams}
              subjects={subjects}
              scores={scores}
              results={processedResults}
            />
          )}

        </div>

      </main>

    </div>
  );
}
