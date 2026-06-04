/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Stream, Student, Subject, Score, GradeBoundary, StudentResultSummary } from '../types';
import { Users, BookOpen, GraduationCap, Award, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  streams: Stream[];
  subjects: Subject[];
  results: StudentResultSummary[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ students, streams, subjects, results, onNavigate }: DashboardProps) {
  // Key Metrics
  const activeStudents = students.filter(s => s.status === 'Active');
  const totalStudentsCount = students.length;
  const activeStreamsCount = streams.length;
  const totalSubjectsCount = subjects.length;

  // Calculate Academy Average
  const academyAvg = results.length > 0 
    ? Number((results.reduce((acc, curr) => acc + curr.averageScore, 0) / results.length).toFixed(1))
    : 0;

  // Calculate Pass Rate (Avg Score >= 50%)
  const passedStudents = results.filter(r => r.averageScore >= 50).length;
  const passRate = results.length > 0
    ? Number(((passedStudents / results.length) * 100).toFixed(0))
    : 0;

  // Compute stream performance averages
  const streamPerformance = streams.map(st => {
    const streamResults = results.filter(r => r.streamId === st.id);
    const avg = streamResults.length > 0
      ? Number((streamResults.reduce((acc, curr) => acc + curr.averageScore, 0) / streamResults.length).toFixed(1))
      : 0;
    return {
      streamName: st.name,
      average: avg,
      studentCount: students.filter(s => s.streamId === st.id).length
    };
  });

  // Department distribution of subjects
  const departments: Record<string, number> = {};
  subjects.forEach(s => {
    departments[s.department] = (departments[s.department] || 0) + 1;
  });

  // Outstanding student achievements (Average >= 80%)
  const topAchievers = [...results]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 4);

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Academy Jumbotron */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <GraduationCap size={240} />
        </div>
        <div className="relative max-w-xl space-y-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-500/20">
            Academic portal • Live Sessions
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif text-slate-100">
            Ikonex Academy Portal
          </h1>
          <p className="text-sm text-slate-300">
            Manage your academic ecosystem. Align class streams, monitor student rosters, record multi-weighted assessments, analyze automatic grades, and explore SQL relational schemas seamlessly.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              id="dashboard_btn_register"
              onClick={() => onNavigate('students')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-slate-100 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Enroll Student
            </button>
            <button
              id="dashboard_btn_gradebook"
              onClick={() => onNavigate('gradebook')}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-indigo-300 rounded-lg text-sm font-medium border border-slate-700/50 transition cursor-pointer"
            >
              Record Scores
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {/* KPI: Total Students */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalStudentsCount}</p>
          <p className="text-xs text-green-650 text-green-600 font-medium mt-2">+{activeStudents.length} Active candidates</p>
        </div>

        {/* KPI: Class Streams */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Streams</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activeStreamsCount}</p>
          <p className="text-xs text-slate-500 mt-2">Forms 1-4 mapped</p>
        </div>

        {/* KPI: Subjects Offered */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects Offered</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalSubjectsCount}</p>
          <p className="text-xs text-amber-600 font-medium mt-2">{Object.keys(departments).length} Course Fields</p>
        </div>

        {/* KPI: Mean Score */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mean Score</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{academyAvg}%</p>
          <p className="text-xs text-indigo-600 font-medium mt-2">High Performance</p>
        </div>

        {/* KPI: Passing Rate */}
        <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passing Rate</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{passRate}%</p>
          <p className="text-xs text-emerald-600 font-medium mt-2">Scored Grade &ge; 50</p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stream Performance (Custom Visual SVG Chart) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Class Stream Performance</h3>
              <p className="text-xs text-slate-500">Average academic scores by class stream</p>
            </div>
            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
              DURABLE ENGINE
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {streamPerformance.map((sp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{sp.streamName} <span className="text-[10px] text-slate-400 font-normal">({sp.studentCount} students)</span></span>
                  <span className="text-indigo-600 font-bold">{sp.average}%</span>
                </div>
                <div className="w-full h-8 bg-slate-50 rounded-lg overflow-hidden flex items-center px-4 relative">
                  {/* SVG background bar tracker */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-500 opacity-20" 
                    style={{ width: `${sp.average}%` }}
                  />
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-indigo-500 h-1 mt-auto transition-all duration-500" 
                    style={{ width: `${sp.average}%` }}
                  />
                  <span className="text-xs font-semibold text-slate-600 z-10 font-mono">
                    {sp.average >= 75 ? '🏆 Top Academic Quality' : sp.average >= 60 ? '⚡ Stable Performance' : sp.average > 0 ? '📝 Needs Assessment' : '🚫 No Scores Recorded'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Star Performers and System Audit */}
        <div className="space-y-6">
          {/* Top Performers List */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Academic Leaderboard</h3>
            <p className="text-xs text-slate-500 mb-4">Top 4 students ranked across all class streams</p>
            
            <div className="space-y-3">
              {topAchievers.length > 0 ? (
                topAchievers.map((top, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">{top.studentName}</h4>
                        <p className="text-[10px] text-slate-500">{top.streamName} • {top.admissionNo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700">
                        {top.averageScore}%
                      </span>
                      <p className="text-[9px] text-slate-400 font-mono">Grade: {top.overallGrade}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No scores configured yet. Go to Gradebook to submit exams.</p>
              )}
            </div>
          </div>
          
          {/* Integrity Badge */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex items-start space-x-3">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-md shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800">Double-Verification Engine</h4>
              <p className="text-[10px] leading-relaxed text-amber-700">
                Grades, scores, rankings, subject positions, and total averages are synchronized on-device using atomic integrity constraints. Score overrides prevent duplication.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
