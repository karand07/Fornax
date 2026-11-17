import { prisma } from '../src/lib/prisma.js';
import { computeWordLevenshtein } from '../src/lib/wer.js';

async function main() {
  console.log('--- Computing OCR Word Error Rate (WER) ---');

  // Query submissions where OCR transcript was edited
  const submissions = await prisma.submission.findMany({
    where: {
      ocrOriginal: { not: null },
      ocrEditedBy: { not: null },
    },
    include: {
      question: true,
      assessment: true,
      user: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  const editedSubmissions = submissions.filter(
    (s) => s.ocrOriginal && s.answerText && s.answerText !== s.ocrOriginal
  );

  console.log(`Found ${editedSubmissions.length} edited OCR submission(s).\n`);

  if (editedSubmissions.length === 0) {
    console.log('No edited submissions found. All transcripts are original.');
    process.exit(0);
  }

  let totalWer = 0;

  for (let i = 0; i < editedSubmissions.length; i++) {
    const s = editedSubmissions[i];
    const { edits, refWords, hypWords, wer } = computeWordLevenshtein(
      s.ocrOriginal!,
      s.answerText!
    );
    totalWer += wer;

    console.log(
      `[${i + 1}/${editedSubmissions.length}] Submission ID: ${s.id}`
    );
    console.log(`  Student: ${s.user.firstName} ${s.user.lastName}`);
    console.log(`  Assessment: ${s.assessment.title}`);
    console.log(`  Original words: ${refWords} | Edited words: ${hypWords}`);
    console.log(`  Word Edits: ${edits} | Item WER: ${(wer * 100).toFixed(2)}%\n`);
  }

  const meanWer = totalWer / editedSubmissions.length;
  console.log('--- Summary ---');
  console.log(`Total Edited Items: ${editedSubmissions.length}`);
  console.log(`Mean Word Error Rate (WER): ${(meanWer * 100).toFixed(2)}%`);
  console.log(
    `Overall OCR Accuracy: ${Math.max(0, (1 - meanWer) * 100).toFixed(2)}%`
  );
}

main()
  .catch((err) => {
    console.error('Error running OCR WER computation:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
