//importing all the requirements
import { Stats } from 'webpack';
import {
  prettyPrint,
  prettyString,
} from '../common/utils/prettyPrint';
import {
  CmdArguments,
  getArguments,
  reportArgConflicts,
} from './src/arguments';
import {
  buildOnce,
  setupFileWatcher,
} from './src/build/buildWebpack';
import { compilePugToHTML } from './src/build/compilePugToHTML';
import {
  CustomElementInformation,
  gatherCustomElementsInformation,
} from './src/build/customElementInfo';
import { setupServer } from './src/serverSetup';
import { once } from '../common/utils/once';
//Setting up the server
const setupServerOnce = once(setupServer);
//Rectifying Compilation 
const logCompiledEntryPoint = (stats: Stats): void => {
  console.log('\n\nCompiled successfully: ');
  stats.compilation.entrypoints.forEach(entry => {
    const chunk = entry.runtimeChunk;
    console.log(`${chunk.name}: ${prettyString(chunk.files)}`);
  });
};
//Checking Compilation errors
const logCompilationErrors = (stats: Stats): void => {
  console.log('\n\nCompilation failed:\n\n');
  console.log((typeof stats.toJson === 'function') ? stats.toJson('errors-only') : stats);
};
//Building output of the Compilation
const buildOnceAndOutput = async (customElementsInformation: ReadonlyArray<CustomElementInformation>, args: CmdArguments) => {
  try {
    const info = await buildOnce(customElementsInformation, { minify: args.minify });
    logCompiledEntryPoint(info);
  }
  catch (info) {
    logCompilationErrors(info);

    throw new Error('Could not compile typescript or styles.');
  }
};

const setupWatcher = async (customElementsInformation: ReadonlyArray<CustomElementInformation>, args: CmdArguments) => {
  setupFileWatcher(customElementsInformation, (error, stats) => {
      if (error || stats.hasErrors()) {
        logCompilationErrors(stats);
      }
      else {
        logCompiledEntryPoint(stats);
        if (args.server) {
          setupServerOnce(customElementsInformation, args);
        }
      }
    },
    { minify: args.minify });
};
//Compilation into HTML
const compileToHTML = async (customElementsInformation: ReadonlyArray<CustomElementInformation>, args: CmdArguments) => {
  await buildOnceAndOutput(customElementsInformation, args);
  try {
    const results = await compilePugToHTML(customElementsInformation, args);
    prettyPrint(results);
  }
  catch (hopefullySomeUsefulInfo) {
    prettyPrint(hopefullySomeUsefulInfo);
  }
};

//The main function
async function main() {
  const args = getArguments(process.argv);
  reportArgConflicts(args);

  const customElementsInformation = gatherCustomElementsInformation();

  if (args.watch) {
    setupWatcher(customElementsInformation, args);
  }
  else {
    if (args.compile) {
      await compileToHTML(customElementsInformation, args);
    }
    else if (args.buildOnce) {
      await buildOnceAndOutput(customElementsInformation, args);
    }
    setupServerOnce(customElementsInformation, args);
  }
}

main();
