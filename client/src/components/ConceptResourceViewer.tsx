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
  onCourseChange?: (newCourseId: string) => void;
}

export const ConceptResourceViewer: React.FC<ConceptResourceViewerProps> = ({
  courseId,
  onCourseChange,
}) => {
  const { user } = useAuth();
  const { data: courses } = useCourses();

  const [internalCourseId, setInternalCourseId] = useState<string | undefined>(courseId);

  // Sync prop changes into internal state
  React.useEffect(() => {
    if (courseId) {
      setInternalCourseId(courseId);
    }
  }, [courseId]);

  const effectiveCourseId = courseId || internalCourseId;
  const dbCourse =
    (effectiveCourseId && courses?.find((c) => c.id === effectiveCourseId)) ||
    courses?.find((c) => c.title.toLowerCase().includes('database')) ||
    courses?.[0];
  const { data: courseDetails } = useCourse(dbCourse?.id || '');

  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Reset selected concept whenever active course changes
  React.useEffect(() => {
    setSelectedConceptId(null);
  }, [dbCourse?.id]);

  const handleCourseChange = (newId: string) => {
    setInternalCourseId(newId);
    setSelectedConceptId(null);
    onCourseChange?.(newId);
  };

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
    BEGINNER: { bg: 'bg-emerald-50', text: 'text-emerald-700 font-semibold', border: 'border-emerald-200' },
    INTERMEDIATE: { bg: 'bg-sky-50', text: 'text-sky-700 font-semibold', border: 'border-sky-200' },
    ADVANCED: { bg: 'bg-purple-50', text: 'text-purple-700 font-semibold', border: 'border-purple-200' },
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
      <div className="rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 font-mono text-xs font-semibold shadow-2xs">
                {courseDetails?.code || dbCourse?.code || 'CS301'}
              </Badge>
              <span className="text-xs text-slate-600 font-semibold">Core Curriculum</span>

              {/* Course Switcher */}
              {courses && courses.length > 1 && (
                <div className="flex items-center gap-2 ml-auto md:ml-4">
                  <span className="text-xs text-slate-700 font-semibold whitespace-nowrap">Switch Course:</span>
                  <select
                    value={dbCourse?.id || ''}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="text-xs rounded-md bg-white border border-slate-300 text-slate-900 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer max-w-[240px] truncate shadow-2xs"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} – {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              {courseDetails?.title || dbCourse?.title || 'Course Curriculum'}
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed font-medium">
              {courseDetails?.description ||
                dbCourse?.description ||
                'Foundations, prerequisite graphs, and curated conceptual resources.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-center min-w-[100px]">
              <div className="text-2xl font-black text-blue-600 font-mono">
                {concepts.length}
              </div>
              <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">
                Concepts (DAG)
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-center min-w-[100px]">
              <div className="text-2xl font-black text-emerald-600 font-mono">
                {concepts.reduce((sum, c) => sum + (c.resources?.length || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">
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
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Prerequisite Concept Chain</h3>
            </div>
            {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold gap-1 shadow-2xs"
                onClick={() => setShowAddConcept(!showAddConcept)}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Concept</span>
              </Button>
            )}
          </div>

          {showAddConcept && (
            <Card className="border-blue-200 bg-blue-50/50 p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-blue-900">Add New Course Concept</h4>
              <form onSubmit={handleCreateConcept} className="space-y-2.5">
                <Input
                  placeholder="Concept Title (e.g. Distributed Consensus)"
                  value={newConceptTitle}
                  onChange={(e) => setNewConceptTitle(e.target.value)}
                  className="text-xs h-8 bg-white border-slate-200 text-slate-900"
                  required
                />
                <Input
                  placeholder="Short Description"
                  value={newConceptDesc}
                  onChange={(e) => setNewConceptDesc(e.target.value)}
                  className="text-xs h-8 bg-white border-slate-200 text-slate-900"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Order"
                    value={newConceptOrder}
                    onChange={(e) => setNewConceptOrder(Number(e.target.value))}
                    className="text-xs h-8 w-24 bg-white border-slate-200 text-slate-900"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Save Concept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-600 hover:text-slate-900"
                    onClick={() => setShowAddConcept(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-2.5">
            {concepts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No concepts defined yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  {user?.role === 'TEACHER' || user?.role === 'ADMIN'
                    ? 'Click "New Concept" above to map the first unit in this curriculum.'
                    : 'Curriculum mapping is currently in progress for this course.'}
                </p>
              </div>
            ) : (
              concepts.map((concept) => {
                const isSelected = (selectedConcept?.id === concept.id);
                const prereqCount = concept.prerequisites?.length || 0;
                const resourceCount = concept.resources?.length || 0;

                return (
                  <div
                    key={concept.id}
                    onClick={() => setSelectedConceptId(concept.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative shadow-2xs ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/40 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {concept.order}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {concept.title}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium line-clamp-1">
                            {concept.description}
                          </p>
                        </div>
                      </div>

                      <ArrowRight
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isSelected ? 'text-blue-600 translate-x-1 font-bold' : 'text-slate-400'
                        }`}
                      />
                    </div>

                    {/* Prerequisites & Resources tag row */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {prereqCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono font-semibold">
                          <GitBranch className="w-3 h-3 text-amber-600" />
                          Prereq: {concept.prerequisites?.map((p) => p.prerequisite?.title.split(' ')[0]).join(', ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Entry Concept
                        </span>
                      )}

                      <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono font-semibold ml-auto">
                        {resourceCount} Resources
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Concept Detail & 3 Resources */}
        <div className="lg:col-span-7 space-y-4">
          {selectedConcept ? (
            <Card className="border-slate-200/90 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-200 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs text-blue-700 border-blue-300 bg-blue-50 font-semibold">
                        Unit {selectedConcept.order}
                      </Badge>
                      {selectedConcept.prerequisites && selectedConcept.prerequisites.length > 0 && (
                        <span className="text-xs text-slate-500 font-medium">
                          Depends on {selectedConcept.prerequisites.length} prior unit(s)
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-extrabold text-slate-900">
                      {selectedConcept.title}
                    </CardTitle>
                    <CardDescription className="text-slate-700 font-medium mt-1">
                      {selectedConcept.description}
                    </CardDescription>
                  </div>

                  {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 h-8 text-xs font-semibold gap-1 shadow-2xs"
                      onClick={() => setShowAddResource(!showAddResource)}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Resource
                    </Button>
                  )}
                </div>

                {/* Difficulty Filter Tabs */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Curated Resources:</span>
                  <div className="flex gap-1">
                    {['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFilterDifficulty(d)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-colors font-semibold ${
                          filterDifficulty === d
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
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
                  <Card className="border-blue-200 bg-blue-50/50 p-4 space-y-3 mb-3 shadow-xs">
                    <h5 className="text-xs font-bold text-blue-900">
                      Add Resource to {selectedConcept.title}
                    </h5>
                    <form onSubmit={handleCreateResource} className="space-y-2.5">
                      <Input
                        placeholder="Resource Title"
                        value={newResTitle}
                        onChange={(e) => setNewResTitle(e.target.value)}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-900"
                        required
                      />
                      <Input
                        placeholder="Description"
                        value={newResDesc}
                        onChange={(e) => setNewResDesc(e.target.value)}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-900"
                      />
                      <Input
                        placeholder="Resource URL (e.g. https://...)"
                        value={newResUrl}
                        onChange={(e) => setNewResUrl(e.target.value)}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-900"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newResDiff}
                          onChange={(e) => setNewResDiff(e.target.value as ResourceDifficulty)}
                          className="text-xs h-8 rounded-md bg-white border border-slate-300 text-slate-900 px-2 font-medium"
                        >
                          <option value="BEGINNER">BEGINNER</option>
                          <option value="INTERMEDIATE">INTERMEDIATE</option>
                          <option value="ADVANCED">ADVANCED</option>
                        </select>
                        <select
                          value={newResType}
                          onChange={(e) => setNewResType(e.target.value as ResourceType)}
                          className="text-xs h-8 rounded-md bg-white border border-slate-300 text-slate-900 px-2 font-medium"
                        >
                          <option value="ARTICLE">ARTICLE</option>
                          <option value="VIDEO">VIDEO</option>
                          <option value="EXERCISE">EXERCISE</option>
                          <option value="DOCUMENT">DOCUMENT</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="h-8 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs">
                          Save Resource
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900"
                          onClick={() => setShowAddResource(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {filteredResources.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm font-medium">
                    No resources matching filter &quot;{filterDifficulty}&quot;.
                  </div>
                ) : (
                  filteredResources.map((res) => {
                    const diffStyle = difficultyColors[res.difficulty] || difficultyColors.BEGINNER;
                    const TypeIcon = typeIcons[res.type] || FileText;

                    return (
                      <div
                        key={res.id}
                        className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-2xs">
                            <TypeIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
                              >
                                {res.difficulty}
                              </Badge>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                                {res.type}
                              </span>
                              {(() => {
                                const raw = res.url?.trim() || '';
                                const url = raw.startsWith('http') ? raw : raw ? `https://${raw}` : '';
                                try {
                                  if (!url) return null;
                                  const domain = new URL(url).hostname.replace(/^www\./, '');
                                  return (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-medium border border-slate-200">
                                      {domain}
                                    </span>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                            <h5 className="text-sm font-bold text-slate-900">
                              {res.url ? (
                                <a
                                  href={res.url.startsWith('http') ? res.url : `https://${res.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600 hover:underline transition-colors inline-flex items-center gap-1.5"
                                >
                                  {res.title}
                                </a>
                              ) : (
                                res.title
                              )}
                            </h5>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                              {res.description}
                            </p>
                          </div>
                        </div>

                        {res.url && (
                          <a
                            href={res.url.startsWith('http') ? res.url : `https://${res.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs transition-colors flex-shrink-0"
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
            <Card className="border-slate-200/90 bg-white p-12 text-center text-slate-500 shadow-xs">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900">
                {concepts.length === 0 ? 'No Units Available' : 'Select a Unit'}
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-medium">
                {concepts.length === 0
                  ? 'Add your first concept unit to curate resources, study guides, and video references.'
                  : 'Select a prerequisite concept from the list on the left to view and manage its learning resources.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
