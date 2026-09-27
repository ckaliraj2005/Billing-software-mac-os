// Test calculation accuracy and edge cases
function roundCurrency(amount) {
  const num = Number(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const tests = [
  { name: 'Floating point addition (0.1 + 0.2)', actual: roundCurrency(0.1 + 0.2), expected: 0.3 },
  { name: 'Tax calculation (19.99 * 0.05)', actual: roundCurrency(19.99 * 0.05), expected: 1.0 },
  { name: '3 cases of 10 pcs at 19.99', actual: roundCurrency(3 * 10 * 19.99), expected: 599.7 },
  { name: 'Discount 10% on 599.7', actual: roundCurrency(599.7 * 10 / 100), expected: 59.97 },
  { name: 'Final total after discount & charges', actual: roundCurrency(Math.max(0, 599.7 - 59.97) + 50 + 25), expected: 614.73 },
  { name: 'Zero handling', actual: roundCurrency(0), expected: 0 },
  { name: 'Negative handling', actual: roundCurrency(-0.0001), expected: 0 }
];

let failed = 0;
tests.forEach(t => {
  const pass = Math.abs(t.actual - t.expected) < 0.000001;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name}: actual=${t.actual}, expected=${t.expected}`);
  if (!pass) failed++;
});

if (failed > 0) {
  console.error(`\n${failed} tests failed!`);
  process.exit(1);
} else {
  console.log(`\nAll ${tests.length} calculation unit tests passed successfully.`);
}
