//SM: need this patch for ensuring the correct workspace is set in e2e runs
// See: https://github.com/nrwl/nx/issues/5065
import '../../utils/e2ePatch'

import { FirebaseBuildExecutorSchema } from './schema';

import { ExecutorContext } from '@nrwl/devkit';
import { createProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import { copyAssetFiles } from '@nrwl/workspace/src/utilities/assets';
import {
  calculateProjectDependencies,
  checkDependentProjectsHaveBeenBuilt,
  createTmpTsConfig,
  updateBuildableProjectPackageJsonDependencies,
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
//import { NodePackageBuilderOptions } from './utils/models';
import compileTypeScriptFiles from './node/package/utils/compile-typescript-files';
import updatePackageJson from './node/package/utils/update-package-json';
import normalizeOptions from './node/package/utils/normalize-options';
import addCliWrapper from './node/package/utils/cli';
import { readJsonFile } from '@nrwl/workspace'


export default async function runExecutor(options: FirebaseBuildExecutorSchema, context: ExecutorContext) {
  console.log('Running Executor for Firebase Build', options);


  const projGraph = createProjectGraph();
  const libRoot = context.workspace.projects[context.projectName].root;
  const normalizedOptions = normalizeOptions(options, context, libRoot);
  const { target, dependencies } = calculateProjectDependencies(
    projGraph,
    context.root,
    context.projectName,
    context.targetName,
    context.configurationName
  );

/*
    normalizedOptions.tsConfig = createTmpTsConfig(
      options.tsConfig,
      context.root,
      target.data.root,
      dependencies
    );
        console.log("tsConfig=" + JSON.stringify(normalizedOptions.tsConfig, null, 3))
        console.log("libRoot=" + libRoot)
        console.log("target=" + JSON.stringify(target, null, 3))

    const tscfg = readJsonFile(normalizedOptions.tsConfig)
        console.log("tsConfig=" + JSON.stringify(tscfg, null, 3))
*/

  const dependentsBuilt = checkDependentProjectsHaveBeenBuilt(
    context.root,
    context.projectName,
    context.targetName,
    dependencies
  );
  if (!dependentsBuilt) {
    throw new Error();
  }
//    console.log("dependencies=" + JSON.stringify(dependencies, null, 3))

  for (const d of dependencies) {
      console.log("- dependency '" + d.name + "'")
  }

  const result = await compileTypeScriptFiles(
    normalizedOptions,
    context,
    libRoot,
    dependencies
  );

  await copyAssetFiles(normalizedOptions.files);

  updatePackageJson(normalizedOptions, context);
  if (
    dependencies.length > 0 &&
    options.updateBuildableProjectDepsInPackageJson
  ) {
    updateBuildableProjectPackageJsonDependencies(
      context.root,
      context.projectName,
      context.targetName,
      context.configurationName,
      target,
      dependencies,
      normalizedOptions.buildableProjectDepsInPackageJsonType
    );
  }

  if (options.cli) {
    addCliWrapper(normalizedOptions, context);
  }

  return {
    ...result,
    outputPath: normalizedOptions.outputPath,
  };


}
