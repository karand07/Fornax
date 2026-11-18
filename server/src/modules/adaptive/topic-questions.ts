export interface TopicQuestion {
  id: string;
  conceptTitle: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topicArea: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const TOPIC_QUESTIONS: TopicQuestion[] = [
  // =========================================================================
  // CONCEPT 1: Entity-Relationship (ER) Modeling
  // =========================================================================
  {
    id: 'er-beg-1',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'BEGINNER',
    topicArea: 'Weak Entity Sets',
    prompt: 'In an Entity-Relationship (ER) diagram, what fundamentally distinguishes a "weak entity set" from a strong entity set?',
    options: [
      'It contains only derived attributes computed dynamically.',
      'It lacks a primary key of its own and depends on an identifying relationship with an owner entity.',
      'It cannot have more than one relationship set in the entire schema.',
      'It can only exist as a temporary table in volatile memory.',
    ],
    correctIndex: 1,
    explanation: 'A weak entity set does not possess sufficient attributes to form a primary key. It relies on a partial discriminator key plus the primary key of its identifying owner entity.',
  },
  {
    id: 'er-beg-2',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'BEGINNER',
    topicArea: 'Diagram Notation',
    prompt: 'In standard Chen ER notation, what does a double rectangle visually represent?',
    options: [
      'A multi-valued attribute.',
      'A derived attribute.',
      'A weak entity set.',
      'An identifying relationship set.',
    ],
    correctIndex: 2,
    explanation: 'Double rectangles represent weak entity sets. Double diamonds represent identifying relationship sets, and double ellipses represent multi-valued attributes.',
  },
  {
    id: 'er-beg-3',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'BEGINNER',
    topicArea: 'Participation Constraints',
    prompt: 'If every employee must be assigned to at least one department, what type of participation constraint exists between Employee and Department?',
    options: [
      'Total participation (existence dependency).',
      'Partial participation.',
      'Derived participation.',
      'Recursive participation.',
    ],
    correctIndex: 0,
    explanation: 'Total participation (represented by a double line) specifies that every entity in the entity set must participate in at least one relationship instance.',
  },
  {
    id: 'er-beg-4',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'BEGINNER',
    topicArea: 'Attribute Classification',
    prompt: 'An employee\'s "Age" can be calculated directly from their "DateOfBirth". In an ER model, what is "Age" classified as?',
    options: [
      'Composite attribute.',
      'Multi-valued attribute.',
      'Stored primary key.',
      'Derived attribute.',
    ],
    correctIndex: 3,
    explanation: 'Derived attributes (drawn with a dashed ellipse) are not physically stored in isolation; their values are derived from other stored attributes like DateOfBirth.',
  },

  {
    id: 'er-int-1',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Relational Mapping',
    prompt: 'When mapping a Many-to-Many (M:N) relationship between "Students" and "Courses" into relational tables, what is the standard transformation?',
    options: [
      'Add courseId as a foreign key column inside the Students table.',
      'Add studentId as a foreign key column inside the Courses table.',
      'Create a separate junction table whose primary key is composed of the foreign keys of both participating tables.',
      'Combine Students and Courses into a single unnormalized flat table with array columns.',
    ],
    correctIndex: 2,
    explanation: 'Many-to-Many relationships cannot be cleanly represented by placing a single foreign key in either entity table without violating 1NF. A separate junction (associative) table with a composite primary key is required.',
  },
  {
    id: 'er-int-2',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Multi-Valued Attribute Mapping',
    prompt: 'When mapping a multi-valued attribute like "PhoneNumbers" for an "Employee" entity into 1NF relational tables, how is it properly structured?',
    options: [
      'Create a new table containing the Employee\'s primary key and a single PhoneNumber column, forming a composite primary key.',
      'Store comma-separated phone numbers in a single varchar column.',
      'Add ten hardcoded columns (phone_1, phone_2, ..., phone_10) to the Employee table.',
      'Store all phone numbers in an encrypted binary blob.',
    ],
    correctIndex: 0,
    explanation: 'To satisfy 1NF (atomic values), a multi-valued attribute is extracted into its own table referencing the owner\'s primary key as a foreign key, with the composite key (employeeId, phoneNumber).',
  },
  {
    id: 'er-int-3',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Weak Entity Relational Schema',
    prompt: 'In an identifying relationship connecting a weak entity "Dependent" to an owner entity "Employee", what forms the primary key of the "Dependent" table?',
    options: [
      'Only the Dependent\'s partial discriminator key (e.g. DependentName).',
      'The combination of the owner Employee\'s primary key (EmployeeId) and the Dependent\'s partial key.',
      'An arbitrary non-unique attribute like DateOfBirth.',
      'A surrogate key that drops any foreign key constraint to Employee.',
    ],
    correctIndex: 1,
    explanation: 'The primary key of a weak entity relation is formed by the primary key of the identifying owner entity combined with the partial key (discriminator) of the weak entity.',
  },
  {
    id: 'er-int-4',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'INTERMEDIATE',
    topicArea: '1:1 Relationship Foreign Key Placement',
    prompt: 'In a 1:1 relationship between "Department" and "Manager" where every Department must have a Manager, but not all Managers run a Department, where should the foreign key be placed to minimize NULLs?',
    options: [
      'In the Department table with a NOT NULL constraint referencing Manager.',
      'In the Manager table with a nullable foreign key referencing Department.',
      'In both tables referencing each other cyclically.',
      'In a temporary session table created during query execution.',
    ],
    correctIndex: 0,
    explanation: 'Placing the foreign key in the entity with total participation (Department) with a NOT NULL constraint avoids NULL values completely, since every department must have a manager.',
  },

  {
    id: 'er-adv-1',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'ADVANCED',
    topicArea: 'Specialization Constraints',
    prompt: 'In an Enhanced ER (EER) model with specialization, what does the "disjoint constraint" (d) specify among subclasses?',
    options: [
      'An entity can belong to at most one subclass in the specialization hierarchy.',
      'An entity must belong to every subclass simultaneously.',
      'The subclasses do not inherit any attributes from the parent superclass.',
      'The parent superclass cannot contain any primary key.',
    ],
    correctIndex: 0,
    explanation: 'The disjoint constraint (d) ensures that subclasses are mutually exclusive: an entity instance can be a member of at most one subclass. Overlapping (o) allows membership in multiple subclasses.',
  },
  {
    id: 'er-adv-2',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'ADVANCED',
    topicArea: 'Ternary vs Binary Relationships',
    prompt: 'Why can a ternary relationship among entities A, B, and C NOT always be decomposed into three binary relationships (A-B, B-C, A-C)?',
    options: [
      'Ternary relationships violate First Normal Form by definition.',
      'Three binary relationships cannot capture an atomic association where A and B jointly determine C.',
      'Binary relationships require more physical disk space than ternary relationships.',
      'Relational database engines cannot enforce foreign keys on binary relationships.',
    ],
    correctIndex: 1,
    explanation: 'A ternary relationship records a simultaneous 3-way association. Three separate binary relationships may indicate that (a,b), (b,c), and (a,c) exist independently, without guaranteeing that (a,b,c) occurred together in a single event.',
  },
  {
    id: 'er-adv-3',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'ADVANCED',
    topicArea: 'Total Specialization',
    prompt: 'In an EER hierarchy with "total specialization" (t) and "overlapping subclasses" (o), what condition must hold for any superclass tuple?',
    options: [
      'It must belong to at least one subclass, and may belong to multiple subclasses simultaneously.',
      'It can exist as a superclass tuple without belonging to any subclass.',
      'It must belong to exactly one subclass and never more.',
      'It must have all its attributes set to NULL.',
    ],
    correctIndex: 0,
    explanation: 'Total specialization requires that every superclass entity must belong to at least one subclass. Overlapping allows it to belong to multiple subclasses at the same time.',
  },
  {
    id: 'er-adv-4',
    conceptTitle: 'Entity-Relationship (ER) Modeling',
    difficulty: 'ADVANCED',
    topicArea: 'Single Table Inheritance Trade-off',
    prompt: 'When mapping an EER hierarchy into a single relational table using a discriminator column, what is the primary engineering trade-off?',
    options: [
      'Fast queries with zero table joins, at the cost of many nullable columns and weaker column-level integrity constraints.',
      'Slow queries due to recursive join chains across foreign keys.',
      'Inability to create secondary indexes on any column.',
      'Strict enforcement of Boyce-Codd Normal Form on all subclasses.',
    ],
    correctIndex: 0,
    explanation: 'Single-table inheritance avoids expensive SQL JOIN operations between superclasses and subclasses, but forces columns unique to specific subclasses to be NULLable, increasing table width and weakening constraints.',
  },

  // =========================================================================
  // CONCEPT 2: Relational Algebra & Schema Design
  // =========================================================================
  {
    id: 'ra-beg-1',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'BEGINNER',
    topicArea: 'Fundamental Operators',
    prompt: 'Which relational algebra operator selects horizontal tuples (rows) satisfying a specified boolean predicate?',
    options: [
      'Projection (π)',
      'Cartesian Product (×)',
      'Selection (σ)',
      'Division (÷)',
    ],
    correctIndex: 2,
    explanation: 'The Selection operator (sigma, σ) acts as a horizontal filter on relations, retaining only rows that satisfy the selection condition.',
  },
  {
    id: 'ra-beg-2',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'BEGINNER',
    topicArea: 'Duplicate Elimination',
    prompt: 'In formal relational algebra, what does the projection operator π_{A, B}(R) do with duplicate tuples?',
    options: [
      'It retains all duplicate rows, exactly like SQL SELECT without DISTINCT.',
      'It automatically eliminates duplicate tuples because mathematical relations are formal sets.',
      'It raises a schema evaluation exception.',
      'It replaces duplicate values with NULL.',
    ],
    correctIndex: 1,
    explanation: 'By mathematical definition, a relation is a set of distinct tuples. The projection operator (pi, π) extracts specified columns and automatically discards duplicate rows.',
  },
  {
    id: 'ra-beg-3',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'BEGINNER',
    topicArea: 'Cartesian Product Cardinality',
    prompt: 'If relation R contains 10 tuples and relation S contains 25 tuples, how many tuples are produced by the Cartesian product R × S?',
    options: [
      '35 tuples',
      '250 tuples',
      '15 tuples',
      '25 tuples',
    ],
    correctIndex: 1,
    explanation: 'The cardinality of Cartesian product R × S is |R| × |S| = 10 × 25 = 250 tuples, pairing every row of R with every row of S.',
  },
  {
    id: 'ra-beg-4',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'BEGINNER',
    topicArea: 'Set Operation Compatibility',
    prompt: 'For set operations like Union (R ∪ S) and Set Difference (R - S) to be valid, what condition must relations R and S satisfy?',
    options: [
      'They must be union-compatible (same degree / attribute count and compatible data types for corresponding columns).',
      'They must share identical primary key values.',
      'Relation R must have strictly more tuples than relation S.',
      'Both relations must be indexed by a B+ Tree.',
    ],
    correctIndex: 0,
    explanation: 'Union compatibility requires that both relations have the exact same number of attributes (degree) and that corresponding domains are type-compatible.',
  },

  {
    id: 'ra-int-1',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Natural Join Semantics',
    prompt: 'Given relations R(A, B, C) and S(C, D, E), what condition does the Natural Join (R ⋈ S) implicitly enforce?',
    options: [
      'It performs a Cartesian product with no filtering.',
      'It equates values on all common attributes (R.C = S.C) and projects out the duplicate join attribute.',
      'It compares all attributes using lexicographical string comparisons.',
      'It joins rows where R.A = S.D and R.B = S.E.',
    ],
    correctIndex: 1,
    explanation: 'Natural Join (⋈) automatically equates attributes with identical names in both schemas (R.C = S.C) and keeps only a single copy of column C in the resulting relation.',
  },
  {
    id: 'ra-int-2',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Semi-Join Operator',
    prompt: 'Which relational operator selects tuples from R that have at least one matching tuple in S on common attributes, without returning any attributes from S?',
    options: [
      'Semi-Join (R ⋉ S)',
      'Full Outer Join (R ⟗ S)',
      'Anti-Join (R ▷ S)',
      'Theta Join (R ⋈_θ S)',
    ],
    correctIndex: 0,
    explanation: 'The Semi-Join (R ⋉ S) returns only attributes from R for rows that participate in the natural join with S. It is widely used in distributed query processing to reduce data transfer.',
  },
  {
    id: 'ra-int-3',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Equivalence Rules',
    prompt: 'Which algebraic equivalence rule allows query optimizers to perform selection pushdown through a join?',
    options: [
      'σ_{A=5}(R ⋈ S) ≡ (σ_{A=5}(R)) ⋈ S, provided attribute A belongs solely to relation R.',
      'π_{A}(R ⋈ S) ≡ π_{A}(R) ⋈ π_{A}(S) for any schema.',
      'σ_{A>10}(R - S) ≡ S - σ_{A>10}(R).',
      'R ⋈ S ≡ R ∪ S.',
    ],
    correctIndex: 0,
    explanation: 'If a selection condition involves only attributes from relation R, it can be pushed down before the join: σ_{A=5}(R ⋈ S) ≡ (σ_{A=5}(R)) ⋈ S, drastically reducing intermediate join size.',
  },
  {
    id: 'ra-int-4',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Theta Join Definition',
    prompt: 'How is the Theta Join (R ⋈_θ S) formally defined in terms of fundamental relational operators?',
    options: [
      'σ_θ(R × S)',
      'π_θ(R × S)',
      '(R ∪ S) - σ_θ(R)',
      'ρ_θ(R ∩ S)',
    ],
    correctIndex: 0,
    explanation: 'Theta join is defined as a Cartesian product followed by a Selection condition θ: R ⋈_θ S = σ_θ(R × S).',
  },

  {
    id: 'ra-adv-1',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'ADVANCED',
    topicArea: 'Division Operator',
    prompt: 'Which classic real-world database query pattern is naturally expressed using the relational Division operator (R ÷ S)?',
    options: [
      '"Find students who have enrolled in ALL courses offered by the CS Department."',
      '"Find students who have taken at least one course."',
      '"Calculate the running average GPA of all students."',
      '"Find courses that currently have zero enrolled students."',
    ],
    correctIndex: 0,
    explanation: 'The Division operator (R ÷ S) answers queries involving the universal quantifier ("for all"), such as finding entities in R associated with every single entity in S.',
  },
  {
    id: 'ra-adv-2',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'ADVANCED',
    topicArea: 'Relational Completeness',
    prompt: 'What does it formally mean for a database query language to be "relationally complete"?',
    options: [
      'It can express at least any query expressible in standard first-order Relational Calculus (or relational algebra).',
      'It is Turing-complete and supports arbitrary recursive functions and while-loops.',
      'It executes all queries in linear O(N) time without disk I/O.',
      'It guarantees zero NULL values across all tables.',
    ],
    correctIndex: 0,
    explanation: 'A query language is relationally complete if its expressive power is at least equivalent to standard relational algebra or safe relational calculus (Codd\'s Theorem).',
  },
  {
    id: 'ra-adv-3',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'ADVANCED',
    topicArea: 'Division Edge Cases',
    prompt: 'Given relation R(A, B) and relation S(B), if S is an empty relation (S = ∅), what is the formal result of the division R ÷ S?',
    options: [
      'All distinct values of attribute A appearing in relation R (vacuously true for all elements of S).',
      'An empty relation ∅.',
      'A runtime division-by-zero database fault.',
      'The entire relation R(A, B).',
    ],
    correctIndex: 0,
    explanation: 'In formal set theory, universal quantification over an empty set (∀y ∈ ∅) is vacuously true. Hence every value a ∈ π_A(R) satisfies the condition, returning all distinct values of A.',
  },
  {
    id: 'ra-adv-4',
    conceptTitle: 'Relational Algebra & Schema Design',
    difficulty: 'ADVANCED',
    topicArea: 'Projection Commutativity Limits',
    prompt: 'Under what circumstance can the Projection operator NOT be commuted directly before a Natural Join (π_L(R ⋈ S) ≠ π_L(R) ⋈ π_L(S))?',
    options: [
      'When the join condition involves attributes that are not present in the projection list L.',
      'When both relations R and S contain primary keys.',
      'When the join is an inner equijoin.',
      'When relation R has more rows than relation S.',
    ],
    correctIndex: 0,
    explanation: 'If attributes needed to evaluate the join predicate are projected away beforehand, the join cannot be computed. The join attributes must be preserved until after the join completes.',
  },

  // =========================================================================
  // CONCEPT 3: Functional Dependencies & Normalization
  // =========================================================================
  {
    id: 'norm-beg-1',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'BEGINNER',
    topicArea: 'First Normal Form (1NF)',
    prompt: 'What is the definitive requirement for a relation to be in First Normal Form (1NF)?',
    options: [
      'Every column domain must contain only atomic (indivisible) values, with no repeating groups or nested relations.',
      'Every non-prime attribute must depend on the whole candidate key.',
      'There must be no transitive functional dependencies.',
      'Every determinant must be a superkey.',
    ],
    correctIndex: 0,
    explanation: '1NF requires all attribute values to be atomic and indivisible. Multi-valued attributes, lists, or nested relations violate 1NF.',
  },
  {
    id: 'norm-beg-2',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'BEGINNER',
    topicArea: 'Second Normal Form (2NF)',
    prompt: 'A relation in 1NF is in Second Normal Form (2NF) if and only if:',
    options: [
      'No non-prime attribute is partially functionally dependent on any candidate key.',
      'Every determinant is a candidate key.',
      'All transitive dependencies are converted into foreign keys.',
      'The primary key consists of exactly one single attribute.',
    ],
    correctIndex: 0,
    explanation: '2NF requires that no non-prime attribute depends on a proper subset of any candidate key (no partial dependencies). If all candidate keys are single attributes, 1NF implies 2NF.',
  },
  {
    id: 'norm-beg-3',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'BEGINNER',
    topicArea: 'Modification Anomalies',
    prompt: 'What type of anomaly occurs when deleting a student record unintentionally deletes the only record of an academic course from the database?',
    options: [
      'Deletion anomaly.',
      'Insertion anomaly.',
      'Update anomaly.',
      'Serialization anomaly.',
    ],
    correctIndex: 0,
    explanation: 'A deletion anomaly occurs when the deletion of data representing one entity causes unintended loss of data representing a completely distinct entity.',
  },
  {
    id: 'norm-beg-4',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'BEGINNER',
    topicArea: 'Transitive Dependencies',
    prompt: 'In relation R(A, B, C), if A → B and B → C (where B does not imply A), what is the dependency A → C called?',
    options: [
      'Transitive dependency.',
      'Partial dependency.',
      'Trivial dependency.',
      'Multi-valued dependency.',
    ],
    correctIndex: 0,
    explanation: 'A transitive dependency occurs when non-prime attribute C is determined by candidate key A indirectly through an intermediate attribute B (A → B and B → C).',
  },

  {
    id: 'norm-int-1',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Attribute Closure Computation',
    prompt: 'Given schema R(A, B, C, D) with functional dependencies {A → B, B → C, C → D}. What is the attribute closure A⁺?',
    options: [
      '{A, B, C, D}',
      '{A, B}',
      '{A, C, D}',
      '{A}',
    ],
    correctIndex: 0,
    explanation: 'Starting with {A}: A → B gives {A, B}; B → C gives {A, B, C}; C → D gives {A, B, C, D}. Thus A⁺ = {A, B, C, D}, making A a superkey.',
  },
  {
    id: 'norm-int-2',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Third Normal Form (3NF) Rules',
    prompt: 'A relation is in 3NF if for every non-trivial functional dependency X → Y, at least one of which two conditions is met?',
    options: [
      'X is a superkey OR Y is a prime attribute (part of some candidate key).',
      'X is a prime attribute OR Y is a superkey.',
      'X and Y are both foreign keys.',
      'X is unique and Y is an integer column.',
    ],
    correctIndex: 0,
    explanation: '3NF allows X → Y if either X is a superkey, or the dependent attribute Y is prime (belongs to a candidate key). This relaxation allows 3NF to always preserve functional dependencies.',
  },
  {
    id: 'norm-int-3',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Candidate Key Determination',
    prompt: 'Given relation R(A, B, C) with dependencies {AB → C, C → B}. What are all the candidate keys of R?',
    options: [
      'AB and AC',
      'Only AB',
      'Only ABC',
      'A and B individually',
    ],
    correctIndex: 0,
    explanation: '(AB)⁺ = {A, B, C}. Since C → B, replacing B with C gives (AC)⁺: AC → C and C → B, so (AC)⁺ = {A, B, C}. Both AB and AC are minimal superkeys.',
  },
  {
    id: 'norm-int-4',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Canonical Cover',
    prompt: 'What is a "canonical cover" (minimal cover) Fc of a set of functional dependencies F?',
    options: [
      'An equivalent set of dependencies with singleton right-hand sides, no extraneous attributes, and no redundant dependencies.',
      'The complete set of all dependencies in F⁺.',
      'A decomposition of relations into exactly two tables.',
      'A list of candidate keys ordered by attribute length.',
    ],
    correctIndex: 0,
    explanation: 'A canonical cover Fc is a minimal equivalent set of functional dependencies: each dependency has a single attribute on the RHS, no attribute on LHS is extraneous, and no dependency in Fc is redundant.',
  },

  {
    id: 'norm-adv-1',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'ADVANCED',
    topicArea: 'BCNF vs 3NF Difference',
    prompt: 'Why is Boyce-Codd Normal Form (BCNF) strictly stronger than 3NF?',
    options: [
      'BCNF disallows X → Y where Y is prime unless X is a superkey, eliminating all redundancy from functional dependencies.',
      'BCNF allows multi-valued attributes whereas 3NF forbids them.',
      'BCNF always preserves functional dependencies whereas 3NF does not.',
      'BCNF requires all relations to have at most two attributes.',
    ],
    correctIndex: 0,
    explanation: '3NF permits non-superkey determinants if the RHS is prime. BCNF removes this exception: every determinant must be a superkey, eliminating transitive dependencies even onto prime attributes.',
  },
  {
    id: 'norm-adv-2',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'ADVANCED',
    topicArea: 'Classification Case Study',
    prompt: 'Given relation R(A, B, C) with dependencies {AB → C, C → B}. What is the highest normal form of R?',
    options: [
      '3NF (because in C → B, B is a prime attribute, but C is not a superkey so it violates BCNF).',
      'BCNF',
      '2NF only',
      '1NF only',
    ],
    correctIndex: 0,
    explanation: 'Candidate keys are AB and AC. In C → B, C is not a superkey, which violates BCNF. However, B is part of candidate key AB (prime attribute), so it satisfies the 3NF relaxation.',
  },
  {
    id: 'norm-adv-3',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'ADVANCED',
    topicArea: 'Lossless Join Property Test',
    prompt: 'When decomposing relation R into R1 and R2, what condition under F⁺ guarantees a lossless-join decomposition?',
    options: [
      '(R1 ∩ R2) → R1 ∈ F⁺ OR (R1 ∩ R2) → R2 ∈ F⁺ (the common attributes must form a superkey of at least one sub-relation).',
      'R1 ∩ R2 = ∅ (the sub-relations must share no common columns).',
      'R1 ∪ R2 must have strictly fewer columns than R.',
      'Both sub-relations must contain the exact same number of rows.',
    ],
    correctIndex: 0,
    explanation: 'A decomposition is lossless-join if and only if the intersection of the two schemas contains a candidate key of at least one of the decomposed schemas.',
  },
  {
    id: 'norm-adv-4',
    conceptTitle: 'Functional Dependencies & Normalization',
    difficulty: 'ADVANCED',
    topicArea: 'Dependency Preservation Trade-off',
    prompt: 'When decomposing R(A, B, C) with {AB → C, C → B} into BCNF relations R1(C, B) and R2(C, A), which critical property is sacrificed?',
    options: [
      'Dependency preservation (checking AB → C requires an expensive cross-table join).',
      'Lossless join decomposition.',
      'First Normal Form.',
      'Primary key indexing capability.',
    ],
    correctIndex: 0,
    explanation: 'The decomposition is lossless because R1 ∩ R2 = {C} and C → B, making C a key of R1. However, the dependency AB → C cannot be enforced in R1 or R2 alone without joining them, so dependency preservation is lost.',
  },

  // =========================================================================
  // CONCEPT 4: SQL Execution & Query Optimization
  // =========================================================================
  {
    id: 'opt-beg-1',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'BEGINNER',
    topicArea: 'EXPLAIN vs EXPLAIN ANALYZE',
    prompt: 'What is the critical distinction between PostgreSQL "EXPLAIN" and "EXPLAIN ANALYZE"?',
    options: [
      'EXPLAIN only shows the planner\'s estimated cost, while EXPLAIN ANALYZE actually executes the query and reports true runtime and row counts.',
      'EXPLAIN executes the query on disk while EXPLAIN ANALYZE runs it in memory only.',
      'EXPLAIN ANALYZE automatically adds missing indexes to the schema.',
      'EXPLAIN modifies the data while EXPLAIN ANALYZE rolls back changes.',
    ],
    correctIndex: 0,
    explanation: 'EXPLAIN produces the execution plan and cost estimates without executing the query. EXPLAIN ANALYZE runs the query, timing each operator and displaying actual row counts alongside estimates.',
  },
  {
    id: 'opt-beg-2',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'BEGINNER',
    topicArea: 'Sequential Scan',
    prompt: 'What occurs during a "Sequential Scan" (Seq Scan) in database query execution?',
    options: [
      'The engine reads every disk page of the table sequentially from start to end, checking filter conditions on each row.',
      'The engine traverses a B+ Tree index starting from the root node.',
      'The engine sorts the entire table in memory before reading.',
      'The engine delegates the query to an external caching server.',
    ],
    correctIndex: 0,
    explanation: 'A sequential scan scans all heap blocks of a table in physical order, checking filter predicates for each tuple without using an index.',
  },
  {
    id: 'opt-beg-3',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'BEGINNER',
    topicArea: 'Cost Metrics',
    prompt: 'In PostgreSQL EXPLAIN output "cost=0.00..45.20 rows=1200 width=32", what does "45.20" represent?',
    options: [
      'The planner\'s estimated total cost to execute the entire plan node (measured in disk page fetch cost units).',
      'The exact execution time in milliseconds.',
      'The amount of RAM required in megabytes.',
      'The CPU temperature during execution.',
    ],
    correctIndex: 0,
    explanation: 'The second cost figure is the estimated total cost to return all rows from the node, measured in arbitrary planner units (where 1.0 represents one sequential disk page read).',
  },
  {
    id: 'opt-beg-4',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'BEGINNER',
    topicArea: 'Index Type Usage',
    prompt: 'Which index data structure is the default in PostgreSQL for primary keys and standard equality / range comparisons (<, <=, =, >=, >)?',
    options: [
      'B+ Tree index',
      'Hash index',
      'GIN index',
      'BRIN index',
    ],
    correctIndex: 0,
    explanation: 'B+ Tree is the default index type in relational database engines because it efficiently supports equality lookups, range scans, prefix matching, and ordered traversal.',
  },

  {
    id: 'opt-int-1',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Selection Pushdown Heuristic',
    prompt: 'What is the primary benefit of the "Selection Pushdown" heuristic in algebraic query optimization?',
    options: [
      'Filtering tuples as early as possible in the query tree to reduce the volume of data entering expensive join operators.',
      'Delaying filtering until all joins and aggregations complete.',
      'Forcing all joins to use a nested loop algorithm.',
      'Converting all SQL queries into asynchronous background jobs.',
    ],
    correctIndex: 0,
    explanation: 'Selection pushdown applies WHERE predicates as close to base table scans as possible, dramatically shrinking intermediate relations before join operations.',
  },
  {
    id: 'opt-int-2',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Join Algorithms',
    prompt: 'When joining two large unindexed, unsorted tables R and S, which join algorithm generally outperforms a basic Nested Loop Join?',
    options: [
      'Hash Join (building an in-memory hash table on the smaller relation and probing with the larger).',
      'Cartesian Product Scan.',
      'Random Block Sample.',
      'Depth-First Tree Search.',
    ],
    correctIndex: 0,
    explanation: 'Hash Join runs in O(|R| + |S|) time by building an in-memory hash table on the smaller relation and scanning the other relation once, avoiding the O(|R| × |S|) quadratic cost of nested loops.',
  },
  {
    id: 'opt-int-3',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Selectivity Estimation',
    prompt: 'How does the query optimizer estimate the selectivity of an equality filter like "WHERE status = \'ACTIVE\'"?',
    options: [
      'By inspecting catalog statistics (e.g. pg_statistic Most Common Values frequencies and histogram bounds).',
      'By executing the query 5 times and calculating the average row count.',
      'By assuming every filter always returns exactly 50% of the table.',
      'By checking the operating system file permissions.',
    ],
    correctIndex: 0,
    explanation: 'Database optimizers rely on periodically collected statistics (via ANALYZE), such as Most Common Values (MCV) lists, relative frequencies, and equi-depth histograms in pg_statistic.',
  },
  {
    id: 'opt-int-4',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Index-Only Scan',
    prompt: 'What characterizes an "Index-Only Scan" in PostgreSQL?',
    options: [
      'All columns requested by the query exist in the index leaf nodes and pages are clean in the visibility map, allowing the engine to skip heap table reads.',
      'The engine rebuilds the index from scratch during query execution.',
      'A scan that bypasses the index to read directly from disk blocks.',
      'A table scan that disables foreign key constraints.',
    ],
    correctIndex: 0,
    explanation: 'An Index-Only Scan satisfies the query entirely from index leaves without touching table heap pages, provided the visibility map indicates the page has no unvacuumed dead tuples.',
  },

  {
    id: 'opt-adv-1',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'ADVANCED',
    topicArea: 'System R Dynamic Programming',
    prompt: 'Why does the classic System R query optimization algorithm restrict its search space to "left-deep join trees"?',
    options: [
      'It restricts search complexity to O(N · 2^N) while facilitating pipelining where the inner operand is always a base relation.',
      'Left-deep trees are the only trees compatible with multi-core CPUs.',
      'Bushy join trees never produce correct mathematical results.',
      'Right-deep join trees cannot utilize B+ Tree indexes.',
    ],
    correctIndex: 0,
    explanation: 'Left-deep trees reduce the search space from factorial O(N!) to O(N · 2^N) and allow pipelined execution where intermediate results are passed directly upward without materializing right-side inner relations.',
  },
  {
    id: 'opt-adv-2',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'ADVANCED',
    topicArea: 'Index Scan vs Seq Scan Decision',
    prompt: 'Why might an optimizer choose a Sequential Scan over a B+ Tree Index Scan even when an index exists on the filter column?',
    options: [
      'High selectivity (the query matches a large percentage of rows, making random I/O from index lookups more costly than sequential page reads).',
      'The table is larger than 10 Megabytes.',
      'Sequential scans are always faster than index scans regardless of row count.',
      'The database has disabled multi-threading.',
    ],
    correctIndex: 0,
    explanation: 'When a query matches more than ~5-15% of a table, the random disk I/O of reading index leaf blocks and bouncing to heap pages exceeds the throughput of streaming sequential disk blocks.',
  },
  {
    id: 'opt-adv-3',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'ADVANCED',
    topicArea: 'Predicate Correlation',
    prompt: 'How does predicate correlation (e.g. WHERE make = \'Audi\' AND model = \'A4\') mislead the query optimizer?',
    options: [
      'The optimizer assumes independent probabilities (P(A ∩ B) = P(A) · P(B)), severely underestimating row counts and choosing suboptimal join orders.',
      'It causes a syntax error during the parsing phase.',
      'It causes an infinite loop in the execution engine.',
      'It forces the database to evict all pages from the buffer pool.',
    ],
    correctIndex: 0,
    explanation: 'Standard optimizers assume column independence. Multiplying their individual selectivities drastically underestimates the actual row count, causing the optimizer to pick nested loops instead of hash joins.',
  },
  {
    id: 'opt-adv-4',
    conceptTitle: 'SQL Execution & Query Optimization',
    difficulty: 'ADVANCED',
    topicArea: 'Sort-Merge Join Performance',
    prompt: 'What is the primary advantage of a Sort-Merge Join over a Hash Join when inputs are already sorted on the join key?',
    options: [
      'It executes in linear O(M + N) time with minimal working memory and no risk of disk spills from hash table overflow.',
      'It eliminates the need for foreign key verification.',
      'It operates without acquiring shared table locks.',
      'It runs strictly in the background without blocking concurrent writes.',
    ],
    correctIndex: 0,
    explanation: 'If inputs are already ordered (e.g. from B+ Tree scans), Sort-Merge Join sweeps through both relations in O(M + N) time using minimal buffer memory, avoiding the memory-heavy build phase of Hash Joins.',
  },

  // =========================================================================
  // CONCEPT 5: Transactions & Concurrency Control
  // =========================================================================
  {
    id: 'tx-beg-1',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'BEGINNER',
    topicArea: 'ACID Properties',
    prompt: 'Which ACID property guarantees that all operations in a transaction either complete entirely or are fully rolled back (all-or-nothing)?',
    options: [
      'Consistency',
      'Atomicity',
      'Isolation',
      'Durability',
    ],
    correctIndex: 1,
    explanation: 'Atomicity ensures that a transaction is treated as a single indivisible unit of work: either all updates are committed, or the transaction is aborted with zero changes persisted.',
  },
  {
    id: 'tx-beg-2',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'BEGINNER',
    topicArea: 'Dirty Read Anomaly',
    prompt: 'What constitutes a "Dirty Read" anomaly (G1) in concurrent transaction processing?',
    options: [
      'Transaction T2 reads uncommitted modifications made by T1, which later aborts and rolls back.',
      'Transaction T1 reads the same row twice and observes different committed values.',
      'Two transactions deadlock trying to lock the same table.',
      'Transaction T1 overwrites an uncommitted write from T2.',
    ],
    correctIndex: 0,
    explanation: 'A dirty read occurs when transaction T2 reads data written by uncommitted transaction T1. If T1 rolls back, T2 has processed data that formally never existed in the database.',
  },
  {
    id: 'tx-beg-3',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'BEGINNER',
    topicArea: 'Durability Mechanism',
    prompt: 'Which logging architecture guarantees the Durability property so committed transactions survive system crashes?',
    options: [
      'Write-Ahead Logging (WAL / Redo Log)',
      'Ephemeral Cache Log',
      'Garbage Collection Trace',
      'Query Optimizer Statistics Log',
    ],
    correctIndex: 0,
    explanation: 'Write-Ahead Logging (WAL) ensures that log records describing data changes are safely written to non-volatile storage before dirty data pages are flushed to disk.',
  },
  {
    id: 'tx-beg-4',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'BEGINNER',
    topicArea: 'Isolation Levels',
    prompt: 'Under SQL standard isolation levels, what is the lowest isolation level that completely prevents Dirty Reads?',
    options: [
      'Read Committed',
      'Read Uncommitted',
      'Repeatable Read',
      'Serializable',
    ],
    correctIndex: 0,
    explanation: 'Read Committed forbids reading uncommitted data, preventing Dirty Reads. Read Uncommitted allows dirty reads; Repeatable Read and Serializable provide even stronger guarantees.',
  },

  {
    id: 'tx-int-1',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Precedence Graph',
    prompt: 'How is a precedence (serialization) graph used to determine whether a concurrent schedule is conflict serializable?',
    options: [
      'The schedule is conflict serializable if and only if its precedence graph contains NO directed cycles.',
      'The schedule is conflict serializable if all nodes have equal in-degree and out-degree.',
      'The schedule is conflict serializable if it contains at most two transactions.',
      'The schedule is conflict serializable if transactions only execute SELECT statements.',
    ],
    correctIndex: 0,
    explanation: 'A directed edge Ti → Tj exists if Ti and Tj have conflicting operations on the same data item and Ti executes first. The schedule is conflict serializable if and only if the precedence graph is acyclic.',
  },
  {
    id: 'tx-int-2',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Two-Phase Locking (2PL)',
    prompt: 'What is the governing rule of Two-Phase Locking (2PL)?',
    options: [
      'Once a transaction releases any lock, it can never acquire any new locks (Growing Phase followed by Shrinking Phase).',
      'Every transaction must acquire exactly two locks during its lifecycle.',
      'Locks must be acquired on two separate server nodes.',
      'All write locks must be released before read locks are acquired.',
    ],
    correctIndex: 0,
    explanation: '2PL divides lock management into a growing phase (locks acquired, none released) and a shrinking phase (locks released, none acquired), guaranteeing conflict serializability.',
  },
  {
    id: 'tx-int-3',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Strict 2PL',
    prompt: 'Why does Strict Two-Phase Locking (Strict 2PL) mandate holding all exclusive (X) locks until the transaction terminates (commit or abort)?',
    options: [
      'To completely prevent cascading aborts by ensuring uncommitted data is never read by other transactions.',
      'To eliminate all deadlocks in the system.',
      'To allow concurrent writers to update the same row simultaneously.',
      'To avoid writing log records to the WAL.',
    ],
    correctIndex: 0,
    explanation: 'Strict 2PL prevents cascading aborts (cascadeless schedules) and provides strictness: no transaction can read or overwrite uncommitted data from an active transaction.',
  },
  {
    id: 'tx-int-4',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Phantom Read Anomaly',
    prompt: 'What characterizes a "Phantom Read" anomaly (A3)?',
    options: [
      'Transaction T1 executes a range query (e.g. WHERE salary > 50000) twice and observes newly inserted rows committed by T2.',
      'A transaction reads a row that was corrupted by a disk head crash.',
      'A transaction receives an unexpected null pointer in memory.',
      'Two transactions deadlock trying to lock identical primary keys.',
    ],
    correctIndex: 0,
    explanation: 'A phantom read occurs when transaction T1 executes a predicate range search, and concurrent transaction T2 inserts new rows matching that predicate and commits before T1 re-executes the search.',
  },

  {
    id: 'tx-adv-1',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'ADVANCED',
    topicArea: 'Snapshot Isolation & Write Skew',
    prompt: 'Under Multi-Version Concurrency Control (MVCC) with Snapshot Isolation, which anomaly can occur that is impossible under true Serializability?',
    options: [
      'Write Skew (concurrent transactions read overlapping state and perform disjoint writes that violate a global cross-record invariant).',
      'Dirty Read anomaly.',
      'Cascading rollback of committed transactions.',
      'Loss of Durability after a clean commit.',
    ],
    correctIndex: 0,
    explanation: 'Snapshot Isolation enforces "first-committer-wins" on individual keys, but concurrent transactions modifying different keys based on overlapping reads can produce Write Skew, violating serializability.',
  },
  {
    id: 'tx-adv-2',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'ADVANCED',
    topicArea: 'MVCC Non-Blocking Reads',
    prompt: 'How does MVCC eliminate read locks and achieve non-blocking reads in the presence of active writers?',
    options: [
      'By maintaining tuple versions with creation/expiry transaction IDs (xmin/xmax), allowing readers to inspect a consistent past snapshot without acquiring shared locks.',
      'By copying the entire database into volatile RAM for each query.',
      'By aborting writer transactions whenever a read query begins.',
      'By delaying all write commits until all active readers disconnect.',
    ],
    correctIndex: 0,
    explanation: 'MVCC keeps multiple physical versions of rows tagged with transaction IDs (xmin/xmax). Readers view a consistent snapshot based on their transaction start time, meaning readers never block writers and writers never block readers.',
  },
  {
    id: 'tx-adv-3',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'ADVANCED',
    topicArea: 'Deadlock Detection',
    prompt: 'How does a relational database engine detect and resolve deadlocks when using locking protocols?',
    options: [
      'It constructs a directed Wait-For Graph (WFG); if a cycle is detected, it selects and aborts a "victim" transaction.',
      'It immediately restarts the entire database server whenever any query takes longer than 2 seconds.',
      'It serializes all transactions onto a single worker thread.',
      'It prevents deadlocks by ignoring all transaction lock requests.',
    ],
    correctIndex: 0,
    explanation: 'A background thread periodically checks the Wait-For Graph for directed cycles (indicating deadlock). When a cycle is detected, the engine aborts a transaction (victim) and rolls back its changes.',
  },
  {
    id: 'tx-adv-4',
    conceptTitle: 'Transactions & Concurrency Control',
    difficulty: 'ADVANCED',
    topicArea: 'Conflict vs View Serializability',
    prompt: 'What is the relationship between Conflict Serializability and View Serializability?',
    options: [
      'Every conflict-serializable schedule is view-serializable, but some view-serializable schedules (with blind writes) are not conflict-serializable; testing view serializability is NP-complete.',
      'View serializability is strictly weaker than conflict serializability and can be checked in O(1) time.',
      'Conflict serializability only applies to read-only queries.',
      'View serializability only applies to queries with SQL VIEW statements.',
    ],
    correctIndex: 0,
    explanation: 'Conflict serializability is a stricter condition that can be checked in polynomial time O(V + E) via cycle detection. View serializability allows blind writes (writing without reading), but testing it is NP-complete.',
  },

  // =========================================================================
  // CONCEPT 6: Storage Engines, B+ Trees & Indexing
  // =========================================================================
  {
    id: 'idx-beg-1',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'BEGINNER',
    topicArea: 'B+ Tree Structure',
    prompt: 'What is the defining structural property of leaf nodes in a B+ Tree index?',
    options: [
      'All leaf nodes reside at the exact same depth from the root and are linked sequentially (doubly-linked) for fast range scans.',
      'Leaf nodes contain only pointers to other internal nodes with no key data.',
      'Leaf nodes have variable depths depending on the order of key insertion.',
      'Leaf nodes are stored in volatile CPU cache only.',
    ],
    correctIndex: 0,
    explanation: 'B+ Trees are perfectly balanced: all leaf nodes are at identical depth and form a linked list, enabling O(log N) point lookups and efficient sequential range traversals.',
  },
  {
    id: 'idx-beg-2',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'BEGINNER',
    topicArea: 'Clustered vs Secondary Index',
    prompt: 'In a "Clustered Index", how are table records physically stored on disk?',
    options: [
      'The physical order of table rows on disk matches the key order of the index (the leaf pages store the actual table rows).',
      'Table rows are scattered randomly on disk and pointed to by memory addresses.',
      'Every table contains up to 10 clustered indexes.',
      'Rows are stored in separate hash tables for each column.',
    ],
    correctIndex: 0,
    explanation: 'A clustered index determines the physical storage order of rows in the table. Because physical rows can only be sorted in one order, a table can have at most one clustered index.',
  },
  {
    id: 'idx-beg-3',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'BEGINNER',
    topicArea: 'Buffer Pool Purpose',
    prompt: 'What is the primary role of the "Buffer Pool" in a relational database engine?',
    options: [
      'An in-memory cache of fixed-size disk pages used to minimize expensive disk I/O operations.',
      'A queue for unparsed SQL query strings waiting for the optimizer.',
      'A network socket buffer for streaming results to clients.',
      'A temporary file on disk used exclusively for query error logs.',
    ],
    correctIndex: 0,
    explanation: 'The buffer pool caches table and index disk pages in RAM. When a query requests a block, the engine checks the buffer pool first, avoiding slow disk accesses on cache hits.',
  },
  {
    id: 'idx-beg-4',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'BEGINNER',
    topicArea: 'Slotted Page Layout',
    prompt: 'In a database "Slotted Page" physical layout, what is stored at the beginning of each disk page?',
    options: [
      'A slot directory containing offset and length pointers to variable-length tuples that grow from the end of the page.',
      'The complete primary key index of the entire database table.',
      'The compiled binary code of stored procedures.',
      'A mirror copy of the operating system FAT file table.',
    ],
    correctIndex: 0,
    explanation: 'Slotted pages store a header and slot directory at the start of the page pointing to variable-length tuples that grow upward from the bottom of the page, allowing tuple movement without breaking external pointers.',
  },

  {
    id: 'idx-int-1',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'INTERMEDIATE',
    topicArea: 'B+ Tree Fanout Capacity',
    prompt: 'Given a B+ Tree with average node fanout B = 100 and tree height h = 3 (root, internal, leaf). Approximately how many records can this index support?',
    options: [
      'Up to ~1,000,000 records (100^3)',
      'Exactly 300 records',
      'Exactly 4,096 records',
      'Up to 100,000,000 records',
    ],
    correctIndex: 0,
    explanation: 'With fanout B = 100, the root points to 100 children, which point to 10,000 leaf nodes. With 100 records per leaf, capacity is ~100^3 = 1,000,000 records with only 3 disk page reads to locate any key.',
  },
  {
    id: 'idx-int-2',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'INTERMEDIATE',
    topicArea: 'B+ Tree vs Binary Search Tree',
    prompt: 'Why are B+ Trees favored over Binary Search Trees (BSTs) or AVL trees for disk-based database storage engines?',
    options: [
      'High fanout drastically reduces tree height, minimizing the number of expensive disk page seeks required to find a record.',
      'Binary search trees consume more RAM than B+ Trees.',
      'AVL trees cannot store string keys.',
      'B+ Trees do not require rebalancing during insertions or deletions.',
    ],
    correctIndex: 0,
    explanation: 'A BST for 1 million keys has a depth of ~20, requiring up to 20 random disk seeks. A B+ Tree with fanout 100 has a depth of 3, locating any key with at most 3 page fetches.',
  },
  {
    id: 'idx-int-3',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Sequential Flooding in Buffer Pool',
    prompt: 'Under what workload pattern does standard Least Recently Used (LRU) buffer pool replacement suffer from "Sequential Flooding"?',
    options: [
      'When a sequential scan of a large table reads pages once and completely evicts frequently accessed (hot) pages from the buffer pool.',
      'When multiple concurrent transactions perform index lookups on primary keys.',
      'When the database runs out of disk storage space.',
      'When all transactions are strictly read-only.',
    ],
    correctIndex: 0,
    explanation: 'Sequential flooding occurs when a large table scan pulls in cold pages that will only be read once, flushing all valuable hot pages from the LRU cache.',
  },
  {
    id: 'idx-int-4',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'INTERMEDIATE',
    topicArea: 'Clock Replacement Algorithm',
    prompt: 'How does the "Clock" (Second-Chance) buffer replacement algorithm approximate LRU with lower synchronization overhead?',
    options: [
      'It uses a circular buffer with a usage bit per frame; when seeking a victim, it clears the bit if set and evicts the first frame whose bit is 0.',
      'It checks the system wall-clock timestamp on every single instruction.',
      'It sorts all buffer frames into a binary min-heap on every access.',
      'It evicts random pages regardless of whether they have been accessed.',
    ],
    correctIndex: 0,
    explanation: 'The Clock algorithm avoids expensive linked-list pointer shuffling on every hit by using a simple circular hand and access bit, offering near-LRU efficiency with much lower lock contention.',
  },

  {
    id: 'idx-adv-1',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'ADVANCED',
    topicArea: 'ARIES WAL Protocol',
    prompt: 'According to the classic ARIES database recovery protocol, what is the core "Write-Ahead Logging" (WAL) rule?',
    options: [
      'The redo log record for an update must be flushed to non-volatile disk before the corresponding dirty data page is written to disk.',
      'Dirty data pages must be written to disk before log records.',
      'Log records are written only during clean database shutdowns.',
      'The buffer pool must be cleared after every SQL query.',
    ],
    correctIndex: 0,
    explanation: 'WAL states that a dirty data page cannot be written to non-volatile storage until the log record describing the update has been flushed to disk. This ensures recovery can always undo or redo changes after a crash.',
  },
  {
    id: 'idx-adv-2',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'ADVANCED',
    topicArea: 'LSM Tree vs B+ Tree Architecture',
    prompt: 'What is the architectural difference between Log-Structured Merge (LSM) Trees and B+ Trees regarding write operations?',
    options: [
      'LSM Trees append all writes sequentially to an in-memory MemTable and flush immutable SSTables to disk, converting random writes into high-throughput sequential I/O.',
      'LSM Trees perform in-place updates on disk blocks like B+ Trees.',
      'LSM Trees cannot perform range scans.',
      'LSM Trees never require background compaction.',
    ],
    correctIndex: 0,
    explanation: 'B+ Trees perform in-place page updates requiring random disk I/O. LSM Trees buffer writes in memory and flush sequential sorted runs (SSTables), providing far superior write performance for write-intensive workloads.',
  },
  {
    id: 'idx-adv-3',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'ADVANCED',
    topicArea: 'Latch Crabbing Protocol',
    prompt: 'During concurrent B+ Tree traversals and modifications, what technique prevents locking the entire tree from the root down?',
    options: [
      'Latch Crabbing (Coupling), where a parent latch is released only after the child node is verified safe against page splits or merges.',
      'Acquiring a global table-level exclusive lock for all queries.',
      'Converting the B+ Tree into an unindexed flat file during updates.',
      'Disabling all concurrency during index page splits.',
    ],
    correctIndex: 0,
    explanation: 'Latch crabbing (coupling) descends the tree by acquiring child latches and releasing parent latches as soon as the child is confirmed "safe" (e.g. will not split or merge), maximizing concurrency across other branches.',
  },
  {
    id: 'idx-adv-4',
    conceptTitle: 'Storage Engines, B+ Trees & Indexing',
    difficulty: 'ADVANCED',
    topicArea: 'Secondary Index Leaf Content',
    prompt: 'In a Secondary (Unclustered) B+ Tree index on a table stored as a heap file, what do the leaf entries contain?',
    options: [
      'The secondary key value and a Record Identifier (RID) / tuple pointer indicating the page ID and slot number in the heap file.',
      'A complete duplicate copy of the entire table row.',
      'Only the column name with no pointer to data.',
      'The memory address of the operating system file descriptor.',
    ],
    correctIndex: 0,
    explanation: 'In heap-organized tables, secondary index leaf nodes store the indexed key alongside a tuple identifier (RID = page_id, slot_number) used to fetch the full row from the heap file.',
  },
];

// Pre-index by ID for instant O(1) lookup
export const TOPIC_QUESTIONS_BY_ID = new Map<string, TopicQuestion>(
  TOPIC_QUESTIONS.map((q) => [q.id, q])
);

/**
 * Filter questions by concept title (fuzzy match) and optional difficulty
 */
export function getTopicQuestionsForConcept(
  conceptTitle: string,
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
): TopicQuestion[] {
  const normTitle = conceptTitle.toLowerCase().trim();

  // Determine standard canonical concept category
  let targetCategory = '';
  if (
    /\ber\b/i.test(normTitle) ||
    normTitle.includes('entity-relationship') ||
    normTitle.includes('entity relationship') ||
    normTitle.includes('er model')
  ) {
    targetCategory = 'Entity-Relationship (ER) Modeling';
  } else if (normTitle.includes('algebra') || normTitle.includes('relational algebra')) {
    targetCategory = 'Relational Algebra & Schema Design';
  } else if (normTitle.includes('normal') || normTitle.includes('functional dependenc')) {
    targetCategory = 'Functional Dependencies & Normalization';
  } else if (
    normTitle.includes('optimization') ||
    normTitle.includes('query execution') ||
    normTitle.includes('explain')
  ) {
    targetCategory = 'SQL Execution & Query Optimization';
  } else if (
    normTitle.includes('transaction') ||
    normTitle.includes('concurrency') ||
    normTitle.includes('acid') ||
    normTitle.includes('serializ')
  ) {
    targetCategory = 'Transactions & Concurrency Control';
  } else if (
    normTitle.includes('index') ||
    normTitle.includes('b+ tree') ||
    normTitle.includes('storage') ||
    normTitle.includes('buffer')
  ) {
    targetCategory = 'Storage Engines, B+ Trees & Indexing';
  }

  const matched = TOPIC_QUESTIONS.filter((q) => {
    let match = false;
    if (targetCategory) {
      match = q.conceptTitle === targetCategory;
    } else {
      const qNorm = q.conceptTitle.toLowerCase().trim();
      match = qNorm.includes(normTitle) || normTitle.includes(qNorm);
    }
    return match && (!difficulty || q.difficulty === difficulty);
  });

  return matched;
}

/**
 * Randomly sample questions for a practice drill or quiz, ensuring VARIETY on every run.
 */
export function sampleVaryingQuestions(
  conceptTitle: string,
  countPerTier: number = 1
): TopicQuestion[] {
  const result: TopicQuestion[] = [];
  const tiers: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> = [
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  for (const tier of tiers) {
    const pool = getTopicQuestionsForConcept(conceptTitle, tier);
    if (pool.length > 0) {
      // Shuffle pool using Fisher-Yates
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, countPerTier);
      result.push(...chosen);
    }
  }

  return result;
}
