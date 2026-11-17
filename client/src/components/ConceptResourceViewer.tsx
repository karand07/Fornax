import React, { useState } from 'react';
import {
  useCourses,
  useCourse,
  useCreateConcept,
  useCreateResource,
  ResourceDifficulty,
  ResourceType,
} from '@/api/hooks';
import { useAuth } from '@/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Layers,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  FileText,
  Video,
  Code2,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';

interface ConceptResourceViewerProps {
  courseId?: string;
}

export const ConceptResourceViewer: React.FC<ConceptResourceViewerProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { data: courses } = useCourses();
  const dbCourse = (courseId && courses?.find((c) => c.id === courseId)) ||
    courses?.find((c) => c.title.toLowerCase().includes('database')) ||
    courses?.[0];
  const { data: courseDetails } = useCourse(dbCourse?.id || '');

  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Teacher creation states
  const [showAddConcept, setShowAddConcept] = useState(false);
  const [newConceptTitle, setNewConceptTitle] = useState('');
  const [newConceptDesc, setNewConceptDesc] = useState('');
  const [newConceptOrder, setNewConceptOrder] = useState<number>(7);

  const [showAddResource, setShowAddResource] = useState(false);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResDesc, setNewResDesc] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResType, setNewResType] = useState<ResourceType>('ARTICLE');
  const [newResDiff, setNewResDiff] = useState<ResourceDifficulty>('BEGINNER');

  const createConceptMutation = useCreateConcept();
  const createResourceMutation = useCreateResource();

  const concepts = courseDetails?.concepts || [];
  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || concepts[0];

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbCourse || !newConceptTitle) return;
    await createConceptMutation.mutateAsync({
      courseId: dbCourse.id,
      title: newConceptTitle,
      description: newConceptDesc,
      order: Number(newConceptOrder),
    });
    setNewConceptTitle('');
    setNewConceptDesc('');
    setShowAddConcept(false);
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcept || !newResTitle) return;
    await createResourceMutation.mutateAsync({
      conceptId: selectedConcept.id,
      title: newResTitle,
      description: newResDesc,
      url: newResUrl,
      type: newResType,
      difficulty: newResDiff,
    });
    setNewResTitle('');
    setNewResDesc('');
    setNewResUrl('');
    setShowAddResource(false);
  };

  const difficultyColors: Record<ResourceDifficulty, { bg: string; text: string; border: string }> = {
    BEGINNER: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    INTERMEDIATE: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
    ADVANCED: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };

  const typeIcons: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
    ARTICLE: FileText,
    VIDEO: Video,
    EXERCISE: Code2,
    DOCUMENT: BookOpen,
  };

  const filteredResources = (selectedConcept?.resources || []).filter((r) => {
    if (filterDifficulty === 'ALL') return true;
    return r.difficulty === filterDifficulty;
  });

  return (
    <div className="space-y-6">
      {/* Course Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-border p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 font-mono text-xs">
                {courseDetails?.code || 'CS301'}
              </Badge>
              <span className="text-xs text-slate-400">Core Curriculum</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              {courseDetails?.title || 'Database Systems'}
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {courseDetails?.description ||
                'Foundations of relational database engines, schema design, relational algebra, SQL optimization, ACID transactions, and disk-based indexing structures.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-card border border-border text-center">
              <div className="text-2xl font-bold text-blue-400 font-mono">
                {concepts.length}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Concepts (DAG)
              </div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-card border border-border text-center">
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {concepts.reduce((sum, c) => sum + (c.resources?.length || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Resources
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Concept Pipeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Concepts List with Prerequisites */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Prerequisite Concept Chain</h3>
            </div>
            {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-dashed gap-1"
                onClick={() => setShowAddConcept(!showAddConcept)}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Concept</span>
              </Button>
            )}
          </div>

          {showAddConcept && (
            <Card className="border-blue-500/30 bg-slate-900/80 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-blue-300">Add New Course Concept</h4>
              <form onSubmit={handleCreateConcept} className="space-y-2.5">
                <Input
                  placeholder="Concept Title (e.g. Distributed Consensus)"
                  value={newConceptTitle}
                  onChange={(e) => setNewConceptTitle(e.target.value)}
                  className="text-xs h-8"
                  required
                />
                <Input
                  placeholder="Short Description"
                  value={newConceptDesc}
                  onChange={(e) => setNewConceptDesc(e.target.value)}
                  className="text-xs h-8"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Order"
                    value={newConceptOrder}
                    onChange={(e) => setNewConceptOrder(Number(e.target.value))}
                    className="text-xs h-8 w-24"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs flex-1">
                    Save Concept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowAddConcept(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-2.5">
            {concepts.map((concept) => {
              const isSelected = (selectedConcept?.id === concept.id);
              const prereqCount = concept.prerequisites?.length || 0;
              const resourceCount = concept.resources?.length || 0;

              return (
                <div
                  key={concept.id}
                  onClick={() => setSelectedConceptId(concept.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
                      : 'bg-card/70 border-border hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {concept.order}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-100 truncate">
                          {concept.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {concept.description}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isSelected ? 'text-blue-400 translate-x-1' : 'text-slate-600'
                      }`}
                    />
                  </div>

                  {/* Prerequisites & Resources tag row */}
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {prereqCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                        <GitBranch className="w-3 h-3" />
                        Prereq: {concept.prerequisites?.map((p) => p.prerequisite?.title.split(' ')[0]).join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        Entry Concept
                      </span>
                    )}

                    <span className="text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded font-mono ml-auto">
                      {resourceCount} Resources
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Concept Detail & 3 Resources */}
        <div className="lg:col-span-7 space-y-4">
          {selectedConcept ? (
            <Card className="border-border bg-card shadow-lg">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs text-blue-400 border-blue-500/30">
                        Unit {selectedConcept.order}
                      </Badge>
                      {selectedConcept.prerequisites && selectedConcept.prerequisites.length > 0 && (
                        <span className="text-xs text-slate-400">
                          Depends on {selectedConcept.prerequisites.length} prior unit(s)
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl text-slate-100">
                      {selectedConcept.title}
                    </CardTitle>
                    <CardDescription className="text-slate-300 mt-1">
                      {selectedConcept.description}
                    </CardDescription>
                  </div>

                  {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-8 text-xs gap-1"
                      onClick={() => setShowAddResource(!showAddResource)}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Resource
                    </Button>
                  )}
                </div>

                {/* Difficulty Filter Tabs */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                  <span className="text-xs font-medium text-slate-400">Curated Resources:</span>
                  <div className="flex gap-1">
                    {['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFilterDifficulty(d)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-colors ${
                          filterDifficulty === d
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {showAddResource && (
                  <Card className="border-border bg-slate-900/90 p-4 space-y-3 mb-3">
                    <h5 className="text-xs font-semibold text-blue-300">
                      Add Resource to {selectedConcept.title}
                    </h5>
                    <form onSubmit={handleCreateResource} className="space-y-2.5">
                      <Input
                        placeholder="Resource Title"
                        value={newResTitle}
                        onChange={(e) => setNewResTitle(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                      <Input
                        placeholder="Description"
                        value={newResDesc}
                        onChange={(e) => setNewResDesc(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Input
                        placeholder="Resource URL (e.g. https://...)"
                        value={newResUrl}
                        onChange={(e) => setNewResUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newResDiff}
                          onChange={(e) => setNewResDiff(e.target.value as ResourceDifficulty)}
                          className="text-xs h-8 rounded-md bg-slate-800 border border-slate-700 text-slate-200 px-2"
                        >
                          <option value="BEGINNER">BEGINNER</option>
                          <option value="INTERMEDIATE">INTERMEDIATE</option>
                          <option value="ADVANCED">ADVANCED</option>
                        </select>
                        <select
                          value={newResType}
                          onChange={(e) => setNewResType(e.target.value as ResourceType)}
                          className="text-xs h-8 rounded-md bg-slate-800 border border-slate-700 text-slate-200 px-2"
                        >
                          <option value="ARTICLE">ARTICLE</option>
                          <option value="VIDEO">VIDEO</option>
                          <option value="EXERCISE">EXERCISE</option>
                          <option value="DOCUMENT">DOCUMENT</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="h-8 text-xs flex-1">
                          Save Resource
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setShowAddResource(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {filteredResources.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No resources matching filter &quot;{filterDifficulty}&quot;.
                  </div>
                ) : (
                  filteredResources.map((res) => {
                    const diffStyle = difficultyColors[res.difficulty] || difficultyColors.BEGINNER;
                    const TypeIcon = typeIcons[res.type] || FileText;

                    return (
                      <div
                        key={res.id}
                        className="p-4 rounded-xl border border-border bg-slate-900/50 hover:bg-slate-900/80 transition-colors flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-300">
                            <TypeIcon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
                              >
                                {res.difficulty}
                              </Badge>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {res.type}
                              </span>
                            </div>
                            <h5 className="text-sm font-semibold text-slate-100">
                              {res.title}
                            </h5>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                              {res.description}
                            </p>
                          </div>
                        </div>

                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
                            title="Open Resource Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-slate-500">Select a concept to view resources.</div>
          )}
        </div>
      </div>
    </div>
  );
};
