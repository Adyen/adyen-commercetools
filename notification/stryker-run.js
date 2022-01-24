const { Stryker } = require('@stryker-mutator/core');

// run stryker in code
async function main() {
  // Runs Stryker, will not assume to be allowed to exit the process.
  const stryker = new Stryker({});
  const mutantResults = await stryker.runMutationTest();
  console.log(mutantResults)
  // mutantResults or rejected with an error.
}

main()
