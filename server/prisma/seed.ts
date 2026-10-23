import { PrismaClient, Role, ResourceDifficulty, ResourceType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'node:process';


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

  // 3. 5 Students (including student@fornax.edu for backward compatibility)
  const studentData = [
    { email: 'student1@fornax.edu', firstName: 'Alex', lastName: 'Rivera' },
    { email: 'student2@fornax.edu', firstName: 'Samantha', lastName: 'Chen' },
    { email: 'student3@fornax.edu', firstName: 'Marcus', lastName: 'Johnson' },
    { email: 'student4@fornax.edu', firstName: 'Elena', lastName: 'Rostova' },
    { email: 'student5@fornax.edu', firstName: 'David', lastName: 'Kim' },
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
    },
    create: {
      code: 'CS301',
      title: 'Database Systems',
      description:
        'Foundations of relational database engines, schema design, relational algebra, SQL optimization, ACID transactions, and disk-based indexing structures.',
      teacherId: teacher.id,
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
      resources: [
        {
          title: 'How Databases Store Data on Disk: Pages, Slotted Tuples, and Heap Files',
          description: 'Understand 8KB page formats, header layouts, and buffer cache dirty page flush mechanics.',
          type: ResourceType.ARTICLE,
          difficulty: ResourceDifficulty.BEGINNER,
          url: 'https://fornax.edu/resources/db/storage-pages-intro',
        },
        {
          title: 'B+ Tree Index Internals: Node Splitting, Merging, and Range Scans',
          description: 'Visual simulation of B+ tree node splits, redistribution, root expansion, and bidirectional leaf pointers.',
          type: ResourceType.VIDEO,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          url: 'https://fornax.edu/resources/db/bplus-tree-internals',
        },
        {
          title: 'High-Performance Index Benchmarking & LSM Compaction',
          description: 'Advanced benchmark comparing B+ trees vs Log-Structured Merge (LSM) Trees under heavy write workloads.',
          type: ResourceType.EXERCISE,
          difficulty: ResourceDifficulty.ADVANCED,
          url: 'https://fornax.edu/resources/db/lsm-vs-btree-benchmarks',
        },
      ],
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

    // Seed 3 resources per concept at different difficulties
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

  console.log('✅ Seeding completed successfully!');
  console.log(`- 1 Admin: ${admin.email}`);
  console.log(`- 1 Teacher: ${teacher.email}`);
  console.log(`- ${students.length} Students enrolled`);
  console.log(`- 1 Course: ${course.title} (${course.code})`);
  console.log(`- 6 Concepts created with prerequisite DAG`);
  console.log(`- 18 Resources created across Beginner, Intermediate, and Advanced difficulties`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
