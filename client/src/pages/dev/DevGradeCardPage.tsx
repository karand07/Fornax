import React, { useState } from 'react';
import { sampleGradeFixtures } from '@/components/grading/fixtures';
import { GradeCard } from '@/components/grading/GradeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Shield, GraduationCap, RefreshCw } from 'lucide-react';

export const DevGradeCardPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const filteredFixtures =
    filter === 'all'
      ? sampleGradeFixtures
      : sampleGradeFixtures.filter((f) => f.id === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-mono text-xs">
              DEV ONLY
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Explainable GradeCard UI Showcase
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Side-by-side visual comparison of Student vs Teacher GradeCard variants across all 6 core states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300">
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="text-xs"
        >
          All 6 States
        </Button>
        {sampleGradeFixtures.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.id)}
            className="text-xs shrink-0"
          >
            {f.title.split('.')[1]?.trim() || f.title}
          </Button>
        ))}
      </div>

      {/* Fixtures List */}
      <div className="space-y-12">
        {filteredFixtures.map((fixture) => (
          <div key={fixture.id} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  {fixture.title}
                </h2>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs w-fit">
                  Max Marks: {fixture.question.maxMarks}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {fixture.description}
              </p>
            </div>

            {/* Side-by-Side Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Student Variant */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider px-1">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Student Variant (Privacy-Safe)</span>
                </div>
                <GradeCard
                  variant="student"
                  question={fixture.question}
                  answer={fixture.answer}
                  grade={fixture.studentGrade}
                />
              </div>

              {/* Right Column: Teacher Variant */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider px-1">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Teacher Variant (Evaluator Controls)</span>
                </div>
                <GradeCard
                  variant="teacher"
                  question={fixture.question}
                  answer={fixture.answer}
                  grade={fixture.teacherGrade}
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 border-slate-700 text-slate-300 hover:text-white"
                      onClick={() => alert(`Review action clicked for ${fixture.title}`)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Override Score (Day 10)
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

