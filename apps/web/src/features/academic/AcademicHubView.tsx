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
    <div className="space-y-8 pb-16">
      {/* Sub-header navigation */}
      <div className="border-b border-[#E5E3D8] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular tracking-wider uppercase text-[#74726A]">
            <span>Scholarship Archive</span>
            <span className="text-[#D8D5C8]">•</span>
            <span>Academic Suite</span>
          </div>
          <h1 className="font-serif-chronicle text-3xl sm:text-4xl text-[#171614] font-normal tracking-tight">
            Academic Suite
          </h1>
          <p className="text-xs text-[#74726A]">
            Timetables, course requirements, grading schemes, and examination milestones.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#FBFBF9] p-1 rounded border border-[#E5E3D8] flex-wrap">
          {ACADEMIC_SUB_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = subTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSubTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all cursor-pointer font-medium ${
                  isActive
                    ? 'bg-[#171614] text-[#FBFBF9]'
                    : 'text-[#74726A] hover:text-[#171614] hover:bg-[#F4F3ED]'
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
