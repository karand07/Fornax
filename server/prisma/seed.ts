import { PrismaClient, Role, ResourceDifficulty, ResourceType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'node:process';
import { assessmentsService } from '../src/modules/assessments/assessments.service.js';


const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fornax.edu' },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: 'admin@fornax.edu',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  // 2. Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@fornax.edu' },
    update: { passwordHash, role: Role.TEACHER },
    create: {
      email: 'teacher@fornax.edu',
      passwordHash,
      role: Role.TEACHER,
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  // 3. 12 Students (plus student@fornax.edu for backward compatibility)
  const studentData = [
    { email: 'student1@fornax.edu', firstName: 'Alex', lastName: 'Rivera' },
    { email: 'student2@fornax.edu', firstName: 'Samantha', lastName: 'Chen' },
    { email: 'student3@fornax.edu', firstName: 'Marcus', lastName: 'Johnson' },
    { email: 'student4@fornax.edu', firstName: 'Elena', lastName: 'Rostova' },
    { email: 'student5@fornax.edu', firstName: 'David', lastName: 'Kim' },
    { email: 'student6@fornax.edu', firstName: 'Maya', lastName: 'Patel' },
    { email: 'student7@fornax.edu', firstName: 'Liam', lastName: "O'Connor" },
    { email: 'student8@fornax.edu', firstName: 'Zoe', lastName: 'Washington' },
    { email: 'student9@fornax.edu', firstName: 'Carlos', lastName: 'Mendez' },
    { email: 'student10@fornax.edu', firstName: 'Priya', lastName: 'Sharma' },
    { email: 'student11@fornax.edu', firstName: 'Lucas', lastName: 'Silva' },
    { email: 'student12@fornax.edu', firstName: 'Aisha', lastName: 'Al-Mansoor' },
    // Also include student@fornax.edu as default student demo login
    { email: 'student@fornax.edu', firstName: 'Alex', lastName: 'Rivera' },
  ];

  const students = [];
  for (const s of studentData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, role: Role.STUDENT },
      create: {
        email: s.email,
        passwordHash,
        role: Role.STUDENT,
        firstName: s.firstName,
        lastName: s.lastName,
      },
    });
    students.push(student);
  }

  // 4. Course: 'Database Systems'
  const course = await prisma.course.upsert({
    where: { code: 'CS301' },
    update: {
      title: 'Database Systems',
      description:
        'Foundations of relational database engines, schema design, relational algebra, SQL optimization, ACID transactions, and disk-based indexing structures.',
      teacherId: teacher.id,
      allowedIpPrefixes: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    },
    create: {
      code: 'CS301',
      title: 'Database Systems',
      description:
        'Foundations of relational database engines, schema design, relational algebra, SQL optimization, ACID transactions, and disk-based indexing structures.',
      teacherId: teacher.id,
      allowedIpPrefixes: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    },
  });

  // 5. Enroll all students in 'Database Systems'
  for (const student of students) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: student.id,
        courseId: course.id,
      },
    });
  }

  // 6. Six concepts in a prerequisite DAG
  // 1. ER Model -> 2. Relational Algebra -> 3. Normalization -> 5. Transactions -> 6. Indexing
  //                             \--------> 4. SQL Optimization --/
  const conceptsData = [
    {
      title: 'Entity-Relationship (ER) Modeling',
      order: 1,
      description:
        'Conceptual database design using entities, attributes, primary/foreign keys, cardinality constraints, and relationship sets.',
      resources: [
        {
          title: 'Foundations of ER Diagrams and Semantic Modeling',
          description: 'A beginner primer on entity sets, attributes, weak entities, and basic relationship cardinalities.',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/er-basics',
        },
        {
          title: 'Mapping Complex ER Hierarchies to Relational Schemas',
          description: 'Step-by-step walkthrough converting 1:N, M:N, and ternary relationships into clean relational tables.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/er-to-relational',
        },
        {
          title: 'Enterprise Case Study: High-Scale EER Modeling',
          description: 'Advanced design challenge dealing with specialization hierarchies, disjoint constraints, and attribute inheritance.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/advanced-eer-lab',
        },
      ],
    },
    {
      title: 'Relational Algebra & Schema Design',
      order: 2,
      description:
        'Formal query language operations: Selection, Projection, Cartesian Product, Set Difference, and Theta/Natural Joins.',
      resources: [
        {
          title: 'Introduction to Fundamental Relational Operators',
          description: 'Visual intuition behind Select (sigma), Project (pi), and Cartesian Product (x).',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/relational-algebra-intro',
        },
        {
          title: 'Mastering Joins: Inner, Outer, Semi, and Anti-Joins',
          description: 'Deep dive into equijoins, natural joins, theta joins, and division operators with visual proofs.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/mastering-joins',
        },
        {
          title: 'Formal Relational Completeness & Equivalence Proofs',
          description: 'Advanced problem set proving query expressiveness and translating domain relational calculus into algebra.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/relational-proofs',
        },
      ],
    },
    {
      title: 'Functional Dependencies & Normalization',
      order: 3,
      description:
        'Eliminating anomalies via normal forms: 1NF, 2NF, 3NF, and Boyce-Codd Normal Form (BCNF), with dependency preservation.',
      resources: [
        {
          title: 'Understanding Redundancy & Update Anomalies',
          description: 'Why unnormalized tables fail: insertion, deletion, and update anomalies explained with real examples.',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/normalization-basics',
        },
        {
          title: 'Computing Attribute Closures and Canonical Covers',
          description: 'Interactive demonstration calculating F+ closures and minimal covers to determine candidate keys.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/closure-algorithms',
        },
        {
          title: 'BCNF vs 3NF Decomposition & Lossless Join Proofs',
          description: 'Rigorous exercises testing lossless decomposition algorithms and dependency preservation trade-offs.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/bcnf-decomposition-lab',
        },
      ],
    },
    {
      title: 'SQL Execution & Query Optimization',
      order: 4,
      description:
        'Declarative SQL translation, query execution plans, relational algebra rewrite heuristics, and cost-based optimizer mechanics.',
      resources: [
        {
          title: 'Reading and Interpreting EXPLAIN ANALYZE Plans',
          description: 'A beginner-friendly guide to inspecting table scans, index scans, and filter predicates in PostgreSQL.',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/explain-analyze-guide',
        },
        {
          title: 'Heuristic Query Optimization & Pushdown Predicates',
          description: 'How modern query planners push down selections, reorder projections, and simplify expressions.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/query-rewriting',
        },
        {
          title: 'Cost-Based Join Order Selection & Dynamic Programming',
          description: 'Advanced lab implementing System R dynamic programming search for optimal left-deep join trees.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/join-optimizer-lab',
        },
      ],
    },
    {
      title: 'Transactions & Concurrency Control',
      order: 5,
      description:
        'ACID guarantees, conflict serializability, Precedence graphs, Two-Phase Locking (2PL), and Multi-Version Concurrency Control (MVCC).',
      resources: [
        {
          title: 'The ACID Guarantee: Atomicity, Consistency, Isolation, Durability',
          description: 'Clear breakdown of transaction lifecycles, commit, rollback, and dirty reads.',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/acid-overview',
        },
        {
          title: 'Conflict Serializability & Strict Two-Phase Locking (S2PL)',
          description: 'Detecting cycles in serialization graphs and preventing cascading aborts with lock managers.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/serializability-and-locking',
        },
        {
          title: 'Simulating MVCC Snapshots & Deadlock Detection',
          description: 'Hands-on programming challenge building a wait-for graph cycle detector and snapshot isolation engine.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/mvcc-concurrency-lab',
        },
      ],
    },
    {
      title: 'Storage Engines, B+ Trees & Indexing',
      order: 6,
      description:
        'Slotted page architectures, buffer pool replacement (LRU/Clock), clustered vs unclustered B+ Tree indexes, and LSM Trees.',
      resources: [],
    },
  ];

  // Map to store created concepts by order
  const createdConcepts: { [order: number]: string } = {};

  for (const cData of conceptsData) {
    // Check if concept already exists for this course
    let concept = await prisma.concept.findFirst({
      where: { courseId: course.id, title: cData.title },
    });

    if (!concept) {
      concept = await prisma.concept.create({
        data: {
          title: cData.title,
          description: cData.description,
          order: cData.order,
          courseId: course.id,
        },
      });
    } else {
      concept = await prisma.concept.update({
        where: { id: concept.id },
        data: {
          description: cData.description,
          order: cData.order,
        },
      });
    }

    createdConcepts[cData.order] = concept.id;

    // For Concept 6 ("Storage Engines, B+ Trees & Indexing"), ensure 0 resources (for empty state testing)
    if (cData.order === 6) {
      await prisma.resource.deleteMany({
        where: { conceptId: concept.id },
      });
    }

    // Seed resources per concept at different difficulties
    for (const rData of cData.resources) {
      const existingResource = await prisma.resource.findFirst({
        where: { conceptId: concept.id, title: rData.title },
      });

      if (!existingResource) {
        await prisma.resource.create({
          data: {
            title: rData.title,
            description: rData.description,
            type: rData.type,
            difficulty: rData.difficulty,
            url: rData.url,
            conceptId: concept.id,
          },
        });
      }
    }
  }

  // 7. Seed Prerequisites DAG:
  // Concept 1 (ER) -> Concept 2 (Relational Algebra)
  // Concept 2 -> Concept 3 (Normalization)
  // Concept 2 -> Concept 4 (SQL Optimization)
  // Concept 3 -> Concept 5 (Transactions)
  // Concept 4 -> Concept 5 (Transactions)
  // Concept 4 -> Concept 6 (Indexing)
  // Concept 5 -> Concept 6 (Indexing)
  const prerequisitesEdges = [
    { conceptOrder: 2, prerequisiteOrder: 1 },
    { conceptOrder: 3, prerequisiteOrder: 2 },
    { conceptOrder: 4, prerequisiteOrder: 2 },
    { conceptOrder: 5, prerequisiteOrder: 3 },
    { conceptOrder: 5, prerequisiteOrder: 4 },
    { conceptOrder: 6, prerequisiteOrder: 4 },
    { conceptOrder: 6, prerequisiteOrder: 5 },
  ];

  for (const edge of prerequisitesEdges) {
    const conceptId = createdConcepts[edge.conceptOrder];
    const prerequisiteId = createdConcepts[edge.prerequisiteOrder];

    if (conceptId && prerequisiteId) {
      await prisma.conceptPrerequisite.upsert({
        where: {
          conceptId_prerequisiteId: {
            conceptId,
            prerequisiteId,
          },
        },
        update: {},
        create: {
          conceptId,
          prerequisiteId,
        },
      });
    }
  }

  // 8. Add published assessment "Normalization Quiz" with 6 MCQs and 2 SHORT questions
  let assessmentId: string;
  const existingAssessment = await prisma.assessment.findFirst({
    where: { courseId: course.id, title: 'Normalization Quiz' },
    include: { questions: true },
  });

  if (!existingAssessment) {
    const createdAssessment = await assessmentsService.createAssessment(
      course.id,
      'Normalization Quiz',
      teacher.id,
      Role.TEACHER
    );

    // 6 MCQs (2 each on 3 different concepts)
    // Concept 1 (ER Modeling)
    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[1],
        prompt: 'In an Entity-Relationship diagram, what does a double rectangle represent?',
        maxMarks: 5,
        options: ['Weak entity set', 'Relationship set', 'Multivalued attribute', 'Derived attribute'],
        correctIndex: 0,
        modelAnswer: 'A double rectangle represents a weak entity set that depends on an identifying entity set.',
      },
      teacher.id,
      Role.TEACHER
    );

    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[1],
        prompt: 'Which cardinality ratio specifies that an entity in A is associated with at most one entity in B?',
        maxMarks: 5,
        options: ['One-to-many', 'Many-to-many', 'One-to-one', 'Zero-to-many'],
        correctIndex: 2,
        modelAnswer: 'One-to-one specifies that at most one entity in B is associated with each entity in A.',
      },
      teacher.id,
      Role.TEACHER
    );

    // Concept 2 (Relational Algebra)
    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[2],
        prompt: 'Which relational algebra operation filters rows that satisfy a given predicate?',
        maxMarks: 5,
        options: ['Projection (π)', 'Selection (σ)', 'Cartesian product (×)', 'Natural Join (⋈)'],
        correctIndex: 1,
        modelAnswer: 'Selection (sigma) is the unary operator used to filter tuples based on a condition.',
      },
      teacher.id,
      Role.TEACHER
    );

    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[2],
        prompt: 'What is the result cardinality of Cartesian product R × S where |R| = 4 and |S| = 5?',
        maxMarks: 5,
        options: ['9', '20', '1', '4^5'],
        correctIndex: 1,
        modelAnswer: 'The size of a Cartesian product is |R| * |S| = 4 * 5 = 20.',
      },
      teacher.id,
      Role.TEACHER
    );

    // Concept 3 (Functional Dependencies & Normalization)
    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[3],
        prompt: 'A relation is in 2NF if it is in 1NF and what condition holds?',
        maxMarks: 5,
        options: [
          'No transitive dependencies exist',
          'Every non-prime attribute is fully functionally dependent on every candidate key',
          'All multivalued dependencies are trivial',
          'Every determinant is a candidate key',
        ],
        correctIndex: 1,
        modelAnswer: '2NF requires that no non-prime attribute is partially dependent on any candidate key.',
      },
      teacher.id,
      Role.TEACHER
    );

    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'MCQ',
        conceptId: createdConcepts[3],
        prompt: 'Which normal form strictly requires that for every functional dependency X -> Y, X is a superkey?',
        maxMarks: 5,
        options: ['1NF', '2NF', '3NF', 'Boyce-Codd Normal Form (BCNF)'],
        correctIndex: 3,
        modelAnswer: 'BCNF strictly requires the determinant X to be a superkey for every non-trivial functional dependency.',
      },
      teacher.id,
      Role.TEACHER
    );

    // 2 SHORT questions with rubrics on Concept 3
    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'SHORT',
        conceptId: createdConcepts[3],
        prompt: 'Explain how to decompose a relation with partial dependencies into Second Normal Form (2NF).',
        maxMarks: 10,
        modelAnswer:
          'Identify partial dependencies where non-key attributes depend on a proper subset of a composite primary key. Create a new relation containing the determinant subset and the dependent attributes, leaving the original key in place.',
        rubric: [
          { description: 'Identifies partial dependencies on composite keys', marks: 5 },
          { description: 'Explains creating new relations with subset determinants', marks: 5 },
        ],
      },
      teacher.id,
      Role.TEACHER
    );

    await assessmentsService.addQuestion(
      createdAssessment.id,
      {
        type: 'SHORT',
        conceptId: createdConcepts[3],
        prompt: 'Discuss the difference between 3NF and BCNF with respect to dependency preservation.',
        maxMarks: 10,
        modelAnswer:
          '3NF allows dependencies X -> A where A is a prime attribute, which guarantees that all functional dependencies can be preserved during decomposition. BCNF does not allow this exception, so certain BCNF decompositions cannot preserve all original dependencies without cross-relation joins.',
        rubric: [
          { description: 'Explains prime attribute exception in 3NF', marks: 5 },
          { description: 'Analyzes why BCNF may not preserve all functional dependencies', marks: 5 },
        ],
      },
      teacher.id,
      Role.TEACHER
    );

    // Publish the assessment
    const publishedAssessment = await assessmentsService.publishAssessment(
      createdAssessment.id,
      teacher.id,
      Role.TEACHER
    );
    assessmentId = publishedAssessment.id;
  } else {
    assessmentId = existingAssessment.id;
  }

  // Reload assessment with questions for student submissions
  const fullAssessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: { orderBy: { createdAt: 'asc' } } },
  });

  if (!fullAssessment) {
    throw new Error('Assessment not found');
  }

  const q = fullAssessment.questions;

    // Pre-create submissions and grades for students
    // Student 1 (Alex Rivera): Strong student (6/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[0].id, [
      { questionId: q[0].id, selectedIndex: 0 },
      { questionId: q[1].id, selectedIndex: 2 },
      { questionId: q[2].id, selectedIndex: 1 },
      { questionId: q[3].id, selectedIndex: 1 },
      { questionId: q[4].id, selectedIndex: 1 },
      { questionId: q[5].id, selectedIndex: 3 },
      { questionId: q[6].id, answerText: 'To achieve 2NF, we identify partial dependencies and decompose into separate relations where attributes depend on the full candidate key.' },
      { questionId: q[7].id, answerText: '3NF permits X->A if A is prime, allowing dependency preservation. BCNF strictly requires X to be a superkey, which may sacrifice dependency preservation.' },
    ]);

    // Student 2 (Samantha Chen): Weak student (1/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[1].id, [
      { questionId: q[0].id, selectedIndex: 1 },
      { questionId: q[1].id, selectedIndex: 0 },
      { questionId: q[2].id, selectedIndex: 0 },
      { questionId: q[3].id, selectedIndex: 1 }, // correct
      { questionId: q[4].id, selectedIndex: 0 },
      { questionId: q[5].id, selectedIndex: 1 },
      { questionId: q[6].id, answerText: 'Put data in tables.' },
      { questionId: q[7].id, answerText: 'They are both normal forms.' },
    ]);

    // Student 3 (Marcus Johnson): Mixed student (4/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[2].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 2 }, // correct
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 0 }, // wrong
      { questionId: q[4].id, selectedIndex: 0 }, // wrong
      { questionId: q[5].id, selectedIndex: 3 }, // correct
      { questionId: q[6].id, answerText: 'Remove partial functional dependencies by moving those columns to their own table.' },
      { questionId: q[7].id, answerText: '3NF is easier to achieve while preserving dependencies.' },
    ]);

    // Student 4 (Elena Rostova): Strong student (5/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[3].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 2 }, // correct
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 1 }, // correct
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 0 }, // wrong
      { questionId: q[6].id, answerText: 'Decompose relations to eliminate non-full dependency on composite keys.' },
      { questionId: q[7].id, answerText: '3NF guarantees dependency preservation while BCNF may lose some dependencies.' },
    ]);

    // Student 5 (David Kim): Mixed student (4/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[4].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 2 }, // correct
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 0 }, // wrong
      { questionId: q[4].id, selectedIndex: 0 }, // wrong
      { questionId: q[5].id, selectedIndex: 3 }, // correct
      { questionId: q[6].id, answerText: 'Split tables with composite keys.' },
      { questionId: q[7].id, answerText: '3NF preserves FDs.' },
    ]);

    // Student 6 (Maya Patel): Strong student (5/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[5].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 2 }, // correct
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 1 }, // correct
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 0 }, // wrong
      { questionId: q[6].id, answerText: 'Ensure all non-key columns depend on the primary key completely.' },
      { questionId: q[7].id, answerText: '3NF maintains all dependencies.' },
    ]);

    // Student 7 (Liam O'Connor): High attendance, weak mastery (1/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[6].id, [
      { questionId: q[0].id, selectedIndex: 1 }, // wrong
      { questionId: q[1].id, selectedIndex: 0 }, // wrong
      { questionId: q[2].id, selectedIndex: 0 }, // wrong
      { questionId: q[3].id, selectedIndex: 0 }, // wrong
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 0 }, // wrong
      { questionId: q[6].id, answerText: 'Not sure about 2NF decomposition.' },
      { questionId: q[7].id, answerText: 'Normal forms simplify tables.' },
    ]);

    // Student 8 (Zoe Washington): Low attendance, strong mastery (6/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[7].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 2 }, // correct
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 1 }, // correct
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 3 }, // correct
      { questionId: q[6].id, answerText: 'Extract partially dependent attributes into a new table where the subset is primary key.' },
      { questionId: q[7].id, answerText: '3NF allows prime attribute determinants, guaranteeing dependency preservation.' },
    ]);

    // Student 9 (Carlos Mendez): Mixed student (3/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[8].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 0 }, // wrong
      { questionId: q[2].id, selectedIndex: 1 }, // correct
      { questionId: q[3].id, selectedIndex: 0 }, // wrong
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 0 }, // wrong
      { questionId: q[6].id, answerText: 'Normalize tables step by step.' },
      { questionId: q[7].id, answerText: '3NF is standard for transactions.' },
    ]);

    // Student 10 (Priya Sharma): Weak student (2/6 MCQs correct)
    await assessmentsService.submitAssessment(fullAssessment!.id, students[9].id, [
      { questionId: q[0].id, selectedIndex: 0 }, // correct
      { questionId: q[1].id, selectedIndex: 0 }, // wrong
      { questionId: q[2].id, selectedIndex: 0 }, // wrong
      { questionId: q[3].id, selectedIndex: 0 }, // wrong
      { questionId: q[4].id, selectedIndex: 1 }, // correct
      { questionId: q[5].id, selectedIndex: 0 }, // wrong
      { questionId: q[6].id, answerText: 'Separate composite columns.' },
      { questionId: q[7].id, answerText: 'BCNF is harder to satisfy.' },
    ]);

    // Student 11 (Lucas Silva): NO submissions (0 assessments -> INSUFFICIENT_DATA)
    // Student 12 (Aisha Al-Mansoor): NO submissions (attendance only -> OK)

    // Student alias (student@fornax.edu)
    const defaultStudent = students.find((s) => s.email === 'student@fornax.edu');
    if (defaultStudent) {
      const existing = await prisma.submission.findFirst({
        where: { assessmentId: fullAssessment.id, userId: defaultStudent.id },
      });
      if (!existing) {
        await assessmentsService.submitAssessment(fullAssessment.id, defaultStudent.id, [
          { questionId: q[0].id, selectedIndex: 0 }, // correct
          { questionId: q[1].id, selectedIndex: 0 }, // wrong
          { questionId: q[2].id, selectedIndex: 1 }, // correct
          { questionId: q[3].id, selectedIndex: 0 }, // wrong
          { questionId: q[4].id, selectedIndex: 1 }, // correct
          { questionId: q[5].id, selectedIndex: 0 }, // wrong
          { questionId: q[6].id, answerText: 'Decompose relations into smaller tables.' },
          { questionId: q[7].id, answerText: 'BCNF is stricter than 3NF.' },
        ]);
      }
    }

    // 8b. Seed assessment for Concept 4 (SQL Execution & Query Optimization) with exactly 1 assessed student
    let optAssessment = await prisma.assessment.findFirst({
      where: { courseId: course.id, title: 'Query Optimization Assessment' },
      include: { questions: true },
    });

    if (!optAssessment) {
      const createdOpt = await assessmentsService.createAssessment(
        course.id,
        'Query Optimization Assessment',
        teacher.id,
        Role.TEACHER
      );

      await assessmentsService.addQuestion(
        createdOpt.id,
        {
          type: 'MCQ',
          conceptId: createdConcepts[4],
          prompt: 'Which query optimizer component estimates the I/O and CPU cost of candidate execution plans?',
          maxMarks: 5,
          options: ['Cost Model Estimator', 'Catalog Manager', 'Query Lexer', 'WAL Log Writer'],
          correctIndex: 0,
          modelAnswer: 'The Cost Model Estimator calculates estimated disk pages and tuple processing costs.',
        },
        teacher.id,
        Role.TEACHER
      );

      await assessmentsService.addQuestion(
        createdOpt.id,
        {
          type: 'MCQ',
          conceptId: createdConcepts[4],
          prompt: 'What plan operator is chosen for equality lookups when a unique B+ Tree index exists?',
          maxMarks: 5,
          options: ['Sequential Table Scan', 'Index Scan', 'Hash Aggregate', 'Nested Loop Anti-Join'],
          correctIndex: 1,
          modelAnswer: 'An Index Scan directly traverses the B+ tree for point lookups.',
        },
        teacher.id,
        Role.TEACHER
      );

      optAssessment = await assessmentsService.publishAssessment(
        createdOpt.id,
        teacher.id,
        Role.TEACHER
      ) as any;
    }

    // Only Student 1 submits Query Optimization Assessment (so Concept 4 has exactly 1 assessed student)
    if (optAssessment && optAssessment.questions && optAssessment.questions.length >= 2) {
      const optSub = await prisma.submission.findFirst({
        where: { assessmentId: optAssessment.id, userId: students[0].id },
      });
      if (!optSub) {
        await assessmentsService.submitAssessment(optAssessment.id, students[0].id, [
          { questionId: optAssessment.questions[0].id, selectedIndex: 0 }, // correct
          { questionId: optAssessment.questions[1].id, selectedIndex: 0 }, // wrong -> 1/2 correct (50%)
        ]);
      }
    }

  // 9. Seed 8 ended class sessions and attendance records for CS301
  await prisma.attendanceRecord.deleteMany({
    where: { session: { courseId: course.id } },
  });
  await prisma.classSession.deleteMany({
    where: { courseId: course.id },
  });

  const sessionTitles = [
    'Lecture 1: Introduction to Relational Databases',
    'Lecture 2: Entity-Relationship Models & ERD',
    'Lecture 3: Relational Algebra Operators',
    'Lecture 4: SQL DDL, DML, and Integrity Constraints',
    'Lecture 5: Functional Dependencies & Boyce-Codd Normal Form',
    'Lecture 6: Multivalued Dependencies & 4NF',
    'Lecture 7: Buffer Pool Management & Storage Engine',
    'Lecture 8: B+ Tree Indexing & Search Keys',
  ];

  const now = Date.now();
  for (let i = 0; i < sessionTitles.length; i++) {
    const daysAgo = 8 - i;
    const sessionDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const windowEndsAt = new Date(sessionDate.getTime() + 60 * 60 * 1000); // 1 hour after start

    const session = await prisma.classSession.create({
      data: {
        courseId: course.id,
        title: sessionTitles[i],
        sessionDate,
        windowEndsAt,
        isActive: false, // Ended session
      },
    });

    // Seed attendance for demo students:
    // student1@fornax.edu: 8/8 present -> rate 1.0 (OK)
    // student2@fornax.edu: 2/8 present (sessions 0, 1) -> rate 0.25 (AT_RISK)
    // student3@fornax.edu: 4/8 present (sessions 0..3) -> rate 0.50 (WATCH)
    // student4@fornax.edu: 7/8 present
    // student5@fornax.edu: 6/8 present
    // student@fornax.edu: 6/8 present (sessions 0..5, session 5 flagged)
    // Seed attendance for 12 students across 8 sessions:
    for (const student of students) {
      // student11 has 0 attendance records (unassessed attendance & mastery -> INSUFFICIENT_DATA)
      if (student.email === 'student11@fornax.edu') {
        continue;
      }

      let isPresent = false;
      let isFlagged = false;

      if (student.email === 'student1@fornax.edu' || student.email === 'student6@fornax.edu' || student.email === 'student7@fornax.edu') {
        isPresent = true; // 8/8
      } else if (student.email === 'student4@fornax.edu' || student.email === 'student12@fornax.edu') {
        isPresent = i < 7; // 7/8
      } else if (student.email === 'student5@fornax.edu' || student.email === 'student@fornax.edu') {
        isPresent = i < 6; // 6/8
        if (student.email === 'student@fornax.edu' && i === 5) isFlagged = true;
      } else if (student.email === 'student3@fornax.edu' || student.email === 'student9@fornax.edu') {
        isPresent = i < 4; // 4/8
      } else if (student.email === 'student10@fornax.edu') {
        isPresent = i < 3; // 3/8
      } else if (student.email === 'student2@fornax.edu') {
        isPresent = i < 2; // 2/8
      } else if (student.email === 'student8@fornax.edu') {
        isPresent = i < 1; // 1/8
      }

      const status: 'PRESENT' | 'FLAGGED' | 'ABSENT' = isFlagged
        ? 'FLAGGED'
        : isPresent
        ? 'PRESENT'
        : 'ABSENT';

      const integrityScore = status === 'PRESENT' ? 1.0 : status === 'FLAGGED' ? 0.7 : 0.0;

      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          userId: student.id,
          status,
          verifiedBy: status === 'FLAGGED' ? 'FACE' : 'QR',
          integrityScore,
          timestamp: sessionDate,
          method: 'SELF',
          codeValid: true,
          networkOk: status !== 'FLAGGED',
          livenessPassed: true,
        },
      });
    }
  }

  console.log('✅ Seeding completed successfully!');
  console.log(`- 1 Admin: ${admin.email}`);
  console.log(`- 1 Teacher: ${teacher.email}`);
  console.log(`- ${students.length} Students enrolled`);
  console.log(`- 1 Course: ${course.title} (${course.code})`);
  console.log(`- 6 Concepts created with prerequisite DAG (Concept 6 has 0 resources)`);
  console.log(`- 15 Resources created across Concepts 1-5`);
  console.log(`- 8 Ended class sessions with attendance records (producing OK, AT_RISK, WATCH)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
