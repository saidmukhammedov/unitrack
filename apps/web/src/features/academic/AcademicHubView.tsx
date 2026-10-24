import React, { useState } from 'react';
import { DashboardView } from '../dashboard/DashboardView';
import { PeriodsView } from './PeriodsView';
import { SubjectsView } from './SubjectsView';
import { TimetableView } from './TimetableView';
import { TasksView } from './TasksView';
import { AssessmentsView } from './AssessmentsView';
import { GradingSchemesView } from './GradingSchemesView';
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  Calendar,
  BookOpen,
  FileText,
  Award,
} from 'lucide-react';

type AcademicSubTab = 'overview' | 'timetable' | 'tasks' | 'periods' | 'subjects' | 'assessments' | 'schemes';

interface AcademicHubViewProps {
  initialSubTab?: AcademicSubTab;
}

export function AcademicHubView({ initialSubTab = 'overview' }: AcademicHubViewProps) {
  const [subTab, setSubTab] = useState<AcademicSubTab>(initialSubTab);

  const ACADEMIC_SUB_NAV = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'timetable', label: 'Timetable', icon: Clock },
    { key: 'tasks', label: 'Coursework', icon: CheckSquare },
    { key: 'periods', label: 'Periods', icon: Calendar },
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'assessments', label: 'Assessments', icon: FileText },
    { key: 'schemes', label: 'Grading Schemes', icon: Award },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Sub-header navigation */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-chronicle text-2xl text-slate-100 font-normal">
            Academic Suite
          </h1>
          <p className="text-xs text-slate-400">
            Timetables, course requirements, grading schemes, and exam schedules.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex-wrap">
          {ACADEMIC_SUB_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = subTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSubTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render selected academic tab */}
      <div>
        {subTab === 'overview' && <DashboardView onNavigate={(tab) => setSubTab(tab as AcademicSubTab)} />}
        {subTab === 'timetable' && <TimetableView />}
        {subTab === 'tasks' && <TasksView />}
        {subTab === 'periods' && <PeriodsView />}
        {subTab === 'subjects' && <SubjectsView />}
        {subTab === 'assessments' && <AssessmentsView />}
        {subTab === 'schemes' && <GradingSchemesView />}
      </div>
    </div>
  );
}
